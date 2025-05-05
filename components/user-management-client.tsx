"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, UserPlus, Check, X, Edit, Trash } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

// Define types
interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "MANAGER" | "USER";
  registrationStatus: "APPROVED" | "PENDING" | "REJECTED";
  createdAt: string | Date;
  image?: string | null;
  company?: Company | null;
}

interface UserActionsProps {
  user: User;
  onStatusChange: (userId: string, status: "APPROVED" | "PENDING" | "REJECTED") => Promise<User>;
  onRoleChange: (userId: string, role: "ADMIN" | "MANAGER" | "USER") => Promise<User>;
}

// Client component for user actions
function UserActions({ user, onStatusChange, onRoleChange }: UserActionsProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role || "USER");
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      // First update the role
      await onRoleChange(user.id, selectedRole);
      
      // Then approve the user
      await onStatusChange(user.id, "APPROVED");
      
      toast({
        title: "User approved",
        description: `${user.name || user.email} has been approved with role: ${selectedRole}`,
      });
      
      setIsApproveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await onStatusChange(user.id, "REJECTED");
      toast({
        title: "User rejected",
        description: `${user.name || user.email} has been rejected`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-gray-200">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="hover:bg-gray-700 cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              <span>Change Role</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-gray-800 border-gray-700 text-gray-200">
                <DropdownMenuItem 
                  className="hover:bg-gray-700 cursor-pointer"
                  onClick={() => onRoleChange(user.id, "USER")}
                >
                  <Badge variant="secondary" className="mr-2">USER</Badge>
                  <span>Regular User</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 cursor-pointer"
                  onClick={() => onRoleChange(user.id, "MANAGER")}
                >
                  <Badge variant="default" className="mr-2">MANAGER</Badge>
                  <span>Manager</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 cursor-pointer"
                  onClick={() => onRoleChange(user.id, "ADMIN")}
                >
                  <Badge variant="destructive" className="mr-2">ADMIN</Badge>
                  <span>Administrator</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          {user.registrationStatus === 'PENDING' && (
            <>
              <DropdownMenuItem 
                className="hover:bg-gray-700 cursor-pointer text-green-500"
                onClick={() => setIsApproveDialogOpen(true)}
              >
                <Check className="mr-2 h-4 w-4" />
                <span>Approve</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="hover:bg-gray-700 cursor-pointer text-red-500"
                onClick={handleReject}
              >
                <X className="mr-2 h-4 w-4" />
                <span>Reject</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem className="hover:bg-gray-700 cursor-pointer text-red-500">
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a role for {user.name || user.email} before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              User Role
            </label>
            <Select 
              value={selectedRole} 
              onValueChange={(value: "USER" | "MANAGER" | "ADMIN") => setSelectedRole(value)}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 text-white">
                <SelectItem value="USER">Regular User</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsApproveDialogOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Approving..." : "Approve User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface InitialData {
  users: User[];
  usersCount: number;
  pendingUsersCount: number;
}

interface UserManagementClientProps {
  initialData: InitialData;
}

// Client component for the page
export function UserManagementClient({ initialData }: UserManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialData.users);
  const [usersCount, setUsersCount] = useState(initialData.usersCount);
  const [pendingUsersCount, setPendingUsersCount] = useState(initialData.pendingUsersCount);

  // Function to update user status
  const handleStatusChange = async (userId: string, status: "APPROVED" | "PENDING" | "REJECTED") => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const updatedUser = await response.json();
      
      // Update the users list
      setUsers(users.map((user: User) => 
        user.id === userId ? updatedUser : user
      ));
      
      // Update counts
      if (status === 'APPROVED' && updatedUser.registrationStatus === 'APPROVED') {
        setPendingUsersCount((prev: number) => Math.max(0, prev - 1));
      } else if (status === 'REJECTED' && updatedUser.registrationStatus === 'REJECTED') {
        setPendingUsersCount((prev: number) => Math.max(0, prev - 1));
      }
      
      // Refresh the page to get updated data
      router.refresh();
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  };

  // Function to update user role
  const handleRoleChange = async (userId: string, role: "ADMIN" | "MANAGER" | "USER") => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      const updatedUser = await response.json();
      
      // Update the users list
      setUsers(users.map((user: User) => 
        user.id === userId ? updatedUser : user
      ));
      
      // Refresh the page to get updated data
      router.refresh();
      
      toast({
        title: "Role updated",
        description: `User role has been updated to ${role}`,
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{usersCount}</div>
            <p className="text-xs text-gray-400">
              Active users in the system
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingUsersCount}</div>
            <p className="text-xs text-gray-400">
              Users waiting for approval
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">User Management</CardTitle>
            <CardDescription className="text-gray-400">
              Manage users, roles, and permissions
            </CardDescription>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-gray-400">User</TableHead>
                <TableHead className="text-gray-400">Email</TableHead>
                <TableHead className="text-gray-400">Company</TableHead>
                <TableHead className="text-gray-400">Role</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Joined</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700">
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {user.image ? (
                          <img src={user.image} alt={user.name || 'User'} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-white">{user.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{user.email}</TableCell>
                  <TableCell className="text-gray-300">{user.company?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      user.role === 'ADMIN' ? 'destructive' : 
                      user.role === 'MANAGER' ? 'default' : 'secondary'
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.registrationStatus === 'APPROVED' ? 'outline' : 
                      user.registrationStatus === 'PENDING' ? 'secondary' : 'destructive'
                    }>
                      {user.registrationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions 
                      user={user} 
                      onStatusChange={handleStatusChange}
                      onRoleChange={handleRoleChange}
                    />
                  </TableCell>
                </TableRow>
              ))}
              
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-gray-700 py-4">
          <p className="text-sm text-gray-400">
            Showing {users.length} of {usersCount} users
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-700">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-700">
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
