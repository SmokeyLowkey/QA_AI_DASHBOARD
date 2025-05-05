"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
  } | null;
}

interface AdminPendingRegistrationsProps {
  initialUsers: User[];
}

export function AdminPendingRegistrations({ initialUsers }: AdminPendingRegistrationsProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const router = useRouter();
  
  const handleAction = async (userId: string, action: "APPROVE" | "REJECT") => {
    try {
      setLoading(prev => ({ ...prev, [userId]: true }));
      
      const response = await fetch(`/api/admin/registrations/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action,
          message: action === "REJECT" ? rejectReason : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update registration");
      }
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      
      toast({
        title: action === "APPROVE" ? "User approved" : "User rejected",
        description: `The user has been ${action === "APPROVE" ? "approved" : "rejected"}.`,
      });
      
      // Close dialog if open
      setSelectedUser(null);
      setRejectReason("");
      
      // Refresh server data
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update registration status.",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Registrations</CardTitle>
          <CardDescription>Approve or reject new user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No pending registrations
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Registrations</CardTitle>
        <CardDescription>Approve or reject new user registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center mt-1">
                  <Badge variant="outline">{user.company?.name || 'No Company'}</Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                  }}
                  disabled={loading[user.id]}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(user.id, 'APPROVE')}
                  disabled={loading[user.id]}
                >
                  {loading[user.id] ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Reject Dialog */}
        {selectedUser && (
          <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Registration</DialogTitle>
                <DialogDescription>
                  Provide a reason for rejecting this registration request.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-2 font-medium">{selectedUser.name} ({selectedUser.email})</p>
                <Textarea
                  placeholder="Reason for rejection (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleAction(selectedUser.id, 'REJECT')}
                  disabled={loading[selectedUser.id]}
                >
                  {loading[selectedUser.id] ? 'Processing...' : 'Reject Registration'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
