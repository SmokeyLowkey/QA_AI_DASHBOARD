"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for message in URL
    const urlMessage = searchParams.get("message");
    if (urlMessage) {
      setMessage(urlMessage);
    }
    
    // Check for error in URL
    const urlError = searchParams.get("error");
    if (urlError === "CredentialsSignin") {
      setError("Invalid email or password");
    } else if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      
      if (result?.error) {
        console.log("Login error:", result.error);
        
        if (result.error.includes("pending approval")) {
          setError("Your account is pending admin approval. Please wait for an administrator to approve your account.");
        } else if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else {
          setError(`Login failed: ${result.error}`);
        }
        return;
      }
      
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your dashboard
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
      
      <p className="px-8 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="hover:text-brand underline underline-offset-4">
          Register
        </Link>
      </p>
    </div>
  );
}
