"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, UserPlus, Check, X, Edit, Trash, Mail } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define types
interface Company {
  id: string;
  name: string;
}

interface Team {
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

interface Invitation {
  id: string;
  email: string;
  token: string;
  teamId: string;
  role: "ADMIN" | "MANAGER" | "USER";
  expiresAt: string | Date;
  invitedById: string;
  accepted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  team: Team;
  invitedBy: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

interface UserActionsProps {
  user: User;
  isAdmin: boolean;
  onRoleChange?: (userId: string, role: "ADMIN" | "MANAGER" | "USER") => Promise<User>;
}

// Client component for user actions
function UserActions({ user, isAdmin, onRoleChange }: UserActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Only admins can change roles
  if (!isAdmin) {
    return (
      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white" disabled>
        <span className="sr-only">No actions available</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  return (
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
        
        {onRoleChange && (
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
        )}
        
        <DropdownMenuItem className="hover:bg-gray-700 cursor-pointer">
          <Mail className="mr-2 h-4 w-4" />
          <span>Send Message</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InvitationActionsProps {
  invitation: Invitation;
  onResendInvitation: (invitationId: string) => Promise<void>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
}

// Client component for invitation actions
function InvitationActions({ invitation, onResendInvitation, onCancelInvitation }: InvitationActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await onResendInvitation(invitation.id);
    } catch (error) {
      console.error("Error resending invitation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await onCancelInvitation(invitation.id);
    } catch (error) {
      console.error("Error canceling invitation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        
        <DropdownMenuItem 
          className="hover:bg-gray-700 cursor-pointer"
          onClick={handleResend}
          disabled={isLoading}
        >
          <Mail className="mr-2 h-4 w-4" />
          <span>Resend Invitation</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="hover:bg-gray-700 cursor-pointer text-red-500"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          <span>Cancel Invitation</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InitialData {
  users: User[];
  invitations: Invitation[];
  usersCount: number;
  pendingInvitationsCount: number;
  isAdmin: boolean;
}

interface CompanyUsersClientProps {
  initialData: InitialData;
}

// Client component for the page
export function CompanyUsersClient({ initialData }: CompanyUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialData.users);
  const [invitations, setInvitations] = useState(initialData.invitations);
  const [usersCount, setUsersCount] = useState(initialData.usersCount);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(initialData.pendingInvitationsCount);
  const [activeTab, setActiveTab] = useState("users");

  // Function to update user role (only for admins)
  const handleRoleChange = async (userId: string, role: "ADMIN" | "MANAGER" | "USER") => {
    if (!initialData.isAdmin) return Promise.reject("Not authorized");
    
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

  // Function to resend invitation
  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/invite/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      toast({
        title: "Invitation resent",
        description: "The invitation has been resent successfully.",
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Function to cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/invite/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel invitation');
      }

      // Update the invitations list
      setInvitations(invitations.filter((invitation: Invitation) => invitation.id !== invitationId));
      setPendingInvitationsCount((prev: number) => Math.max(0, prev - 1));
      
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully.",
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
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
              Company Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{usersCount}</div>
            <p className="text-xs text-gray-400">
              Active users in your company
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingInvitationsCount}</div>
            <p className="text-xs text-gray-400">
              Invitations waiting for acceptance
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Company Users Management</CardTitle>
            <CardDescription className="text-gray-400">
              Manage users and invitations in your company
            </CardDescription>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/dashboard/teams">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800">
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
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
                          isAdmin={initialData.isAdmin}
                          onRoleChange={initialData.isAdmin ? handleRoleChange : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                        No users found in your company.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="invitations">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800">
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Team</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Invited By</TableHead>
                    <TableHead className="text-gray-400">Expires</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation: Invitation) => (
                    <TableRow key={invitation.id} className="border-gray-700 hover:bg-gray-700">
                      <TableCell className="font-medium text-white">
                        {invitation.email}
                      </TableCell>
                      <TableCell className="text-gray-300">{invitation.team.name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invitation.role === 'ADMIN' ? 'destructive' : 
                          invitation.role === 'MANAGER' ? 'default' : 'secondary'
                        }>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {invitation.invitedBy.name || invitation.invitedBy.email}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <InvitationActions 
                          invitation={invitation}
                          onResendInvitation={handleResendInvitation}
                          onCancelInvitation={handleCancelInvitation}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {invitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                        No pending invitations found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-gray-700 py-4">
          <p className="text-sm text-gray-400">
            {activeTab === "users" 
              ? `Showing ${users.length} of ${usersCount} users`
              : `Showing ${invitations.length} of ${pendingInvitationsCount} invitations`
            }
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
