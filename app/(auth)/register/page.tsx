"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  company: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  
  // Check for invitation token and email in URL
  useEffect(() => {
    const token = searchParams.get("invitation");
    const email = searchParams.get("email");
    
    if (token) {
      setInvitation(token);
    }
    
    if (email) {
      setInvitedEmail(email);
      form.setValue("email", email);
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        name: values.name,
        email: values.email,
        company: values.company,
        password: values.password,
      };
      
      // Add invitation token if present
      if (invitation) {
        Object.assign(payload, { invitation });
      }
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Invalid response from server");
      }
      
      if (!response.ok) {
        if (data?.error) {
          if (data.error === "User already exists") {
            throw new Error("A user with this email already exists. Please use a different email or try logging in.");
          } else {
            throw new Error(data.error);
          }
        } else {
          throw new Error(`Registration failed with status: ${response.status}`);
        }
      }
      
      setSuccess("Registration successful! Your account is pending approval.");
      console.log("Registration successful:", data);
      
      // Clear form
      form.reset();
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push("/login?message=Registration successful. Please wait for admin approval.");
      }, 3000);
    } catch (error) {
      console.error("Registration error:", error);
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} />
                </FormControl>
                <FormDescription>
                  Enter your company or organization name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="********" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input placeholder="********" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </form>
      </Form>
      
      <p className="px-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="hover:text-brand underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
