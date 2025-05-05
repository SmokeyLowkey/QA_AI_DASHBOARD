"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { TeamInviteForm } from "@/components/team-invite-form";
import { Edit, MoreHorizontal, Plus, Save, Trash, UserPlus, Users } from "lucide-react";

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
  };
  members: TeamMember[];
  _count: {
    employees: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

interface CriteriaTemplate {
  id: string;
  criteria: {
    id: string;
    name: string;
    description: string | null;
    createdBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
    categories: {
      id: string;
      name: string;
    }[];
    _count: {
      recordings: number;
    };
  };
}

interface TeamDetailClientProps {
  team: Team;
  isManager: boolean;
  companyUsers: User[];
  currentUserId: string;
}

export function TeamDetailClient({ team, isManager, companyUsers, currentUserId }: TeamDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState<string | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedTemplates, setAssignedTemplates] = useState<CriteriaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  
  const [teamName, setTeamName] = useState(team.name);
  const [teamDescription, setTeamDescription] = useState(team.description || "");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [updatingRole, setUpdatingRole] = useState("");

  // Function to update team details
  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update team");
      }

      toast({
        title: "Team updated",
        description: "Team details have been updated successfully",
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to add a member to the team
  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add team member");
      }

      toast({
        title: "Member added",
        description: "Team member has been added successfully",
      });

      setIsAddingMember(false);
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      router.refresh();
    } catch (error) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to update a member's role
  const handleUpdateMember = async (memberId: string) => {
    if (!updatingRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: updatingRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update team member");
      }

      toast({
        title: "Member updated",
        description: "Team member role has been updated successfully",
      });

      setIsUpdatingMember(null);
      setUpdatingRole("");
      router.refresh();
    } catch (error) {
      console.error("Error updating team member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch assigned criteria templates
  useEffect(() => {
    const fetchAssignedTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const response = await fetch(`/api/teams/${team.id}/criteria`);
        
        if (response.ok) {
          const data = await response.json();
          setAssignedTemplates(data);
        } else {
          console.error("Failed to fetch assigned templates");
        }
      } catch (error) {
        console.error("Error fetching assigned templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchAssignedTemplates();
  }, [team.id]);

  // Function to remove a criteria template assignment
  const handleRemoveTemplate = async (criteriaId: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}/criteria/${criteriaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove template");
      }

      toast({
        title: "Template removed",
        description: "Criteria template has been removed from this team",
      });

      // Update the local state to remove the template
      setAssignedTemplates(assignedTemplates.filter(
        template => template.criteria.id !== criteriaId
      ));
    } catch (error) {
      console.error("Error removing template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to remove a member from the team
  const handleRemoveMember = async (memberId: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove team member");
      }

      toast({
        title: "Member removed",
        description: "Team member has been removed successfully",
      });

      setIsRemovingMember(null);
      router.refresh();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="criteria">Criteria Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                {team.members.length} members in this team
              </p>
            </div>
            <div className="flex gap-2">
              {isManager && (
                <>
                  <Button onClick={() => setIsAddingMember(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                  <TeamInviteForm 
                    teamId={team.id} 
                    teamName={team.name} 
                    onSuccess={() => router.refresh()}
                  />
                </>
              )}
            </div>
          </div>
          
          <div className="grid gap-4">
            {team.members.map((member) => (
              <Card key={member.id}>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback>
                          {member.user.name?.charAt(0) || member.user.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{member.user.name}</CardTitle>
                        <CardDescription>{member.user.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">
                        {member.role === "MANAGER" ? "Team Manager" : "Team Member"}
                      </div>
                      {isManager && member.userId !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setIsUpdatingMember(member.id);
                              setUpdatingRole(member.role);
                            }}>
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setIsRemovingMember(member.id)}
                            >
                              Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="criteria" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">QA Criteria Templates</h2>
              <p className="text-sm text-muted-foreground">
                Manage quality assessment criteria templates for this team
              </p>
            </div>
            <div className="flex gap-2">
              {isManager && (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/criteria?teamId=${team.id}`}>
                      View Team Criteria
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/dashboard/criteria/new?teamId=${team.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Template
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Assign Criteria Template</CardTitle>
              <CardDescription>
                Assign existing criteria templates to this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Button asChild>
                  <Link href={`/dashboard/criteria?assignToTeam=${team.id}`}>
                    Browse Available Templates
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Assigned Templates</CardTitle>
              <CardDescription>
                Criteria templates currently assigned to this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    Loading assigned templates...
                  </p>
                </div>
              ) : assignedTemplates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    No criteria templates assigned to this team yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {assignedTemplates.map((template) => (
                    <Card key={template.id} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{template.criteria.name}</CardTitle>
                            <CardDescription>
                              {template.criteria.description || "No description provided"}
                            </CardDescription>
                          </div>
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveTemplate(template.criteria.id)}
                              disabled={isSubmitting}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Categories</p>
                            <p className="font-medium">{template.criteria.categories.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Used in</p>
                            <p className="font-medium">{template.criteria._count.recordings} recordings</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 bg-muted/50">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/criteria/${template.criteria.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Details</CardTitle>
                  <CardDescription>
                    View and update team information
                  </CardDescription>
                </div>
                {isManager && !isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Enter team description"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Team Name</h3>
                    <p>{team.name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Description</h3>
                    <p>{team.description || "No description provided"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Company</h3>
                    <p>{team.company.name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Created</h3>
                    <p>{new Date(team.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
            {isEditing && (
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setTeamName(team.name);
                    setTeamDescription(team.description || "");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateTeam} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an existing user to this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {companyUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Team Member</SelectItem>
                  <SelectItem value="MANAGER">Team Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingMember(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Member Dialog */}
      <Dialog open={!!isUpdatingMember} onOpenChange={(open) => !open && setIsUpdatingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update the role of this team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={updatingRole}
                onValueChange={setUpdatingRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Team Member</SelectItem>
                  <SelectItem value="MANAGER">Team Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdatingMember(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => isUpdatingMember && handleUpdateMember(isUpdatingMember)} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={!!isRemovingMember} onOpenChange={(open) => !open && setIsRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemovingMember(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => isRemovingMember && handleRemoveMember(isRemovingMember)} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
