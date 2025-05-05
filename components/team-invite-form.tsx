"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { UserPlus } from "lucide-react";

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  role: z.enum(["USER", "MANAGER"], {
    required_error: "Please select a role.",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface TeamInviteFormProps {
  teamId: string;
  teamName: string;
  onSuccess?: () => void;
}

export function TeamInviteForm({ teamId, teamName, onSuccess }: TeamInviteFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "USER",
    },
  });

  async function onSubmit(data: InviteFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          teamId,
          role: data.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      toast({
        title: "Invitation sent",
        description: result.status === "added" 
          ? `${data.email} has been added to the team.` 
          : `Invitation sent to ${data.email}.`,
      });

      form.reset();
      setOpen(false);

      if (onSuccess) {
        onSuccess();
      }

      router.refresh();
    } catch (error) {
      console.error("Invitation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {teamName}</DialogTitle>
          <DialogDescription>
            Send an invitation to join this team. If the user already exists, they will be added directly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="colleague@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the email address of the person you want to invite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USER">Team Member</SelectItem>
                      <SelectItem value="MANAGER">Team Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the role for this team member.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
