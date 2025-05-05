# QA AI Dashboard - Phase 1 Implementation Plan

This document provides detailed implementation instructions for Phase 1 of the QA AI Dashboard project, focusing on database schema changes and the authentication system.

## Database Schema Changes

### 1. Update Prisma Schema

Create the following changes to `prisma/schema.prisma`:

```prisma
// Add to existing User model
model User {
  id                String       @id @default(cuid())
  name              String?
  email             String?      @unique
  emailVerified     DateTime?
  image             String?
  role              UserRole     @default(USER)
  password          String?      // For credentials provider
  registrationStatus RegStatus   @default(PENDING)  // New field
  companyId         String?      // New field
  company           Company?     @relation(fields: [companyId], references: [id])
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  accounts          Account[]
  sessions          Session[]
  teams             TeamMember[]
  recordings        Recording[]
  reviewedRecordings Recording[]  @relation("ReviewedRecordings")
  createdCriteria   QACriteria[]
  notifications     Notification[]
  notificationPreferences NotificationPreference[]
  auditLogs         AuditLog[]
}

// New enum for registration status
enum RegStatus {
  PENDING
  APPROVED
  REJECTED
}

// New Company model
model Company {
  id            String    @id @default(cuid())
  name          String    @unique
  s3FolderName  String    @unique  // Sanitized name for S3 folder
  description   String?
  website       String?
  industry      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  users         User[]
  employees     Employee[]
  teams         Team[]
  webhooks      Webhook[]
}

// New Employee model
model Employee {
  id            String      @id @default(cuid())
  name          String
  email         String?     @unique
  department    String?
  position      String?
  employeeId    String?     // Internal employee ID
  s3FolderName  String      // Folder name in S3
  hireDate      DateTime?
  companyId     String      // New required field
  company       Company     @relation(fields: [companyId], references: [id])
  teamId        String?
  team          Team?       @relation(fields: [teamId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  recordings    Recording[]
  performanceMetrics PerformanceMetric[]
  
  @@unique([companyId, employeeId])  // Ensure employee IDs are unique within a company
}

// New PerformanceMetric model
model PerformanceMetric {
  id            String    @id @default(cuid())
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  period        String    // e.g., "2025-04", "2025-Q2"
  overallScore  Int       // 0-100
  customerService Int     // 0-100
  productKnowledge Int    // 0-100
  communicationSkills Int // 0-100
  complianceAdherence Int // 0-100
  callCount     Int       // Number of calls in this period
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// New QACriteria model
model QACriteria {
  id                String    @id @default(cuid())
  name              String
  description       String?
  createdById       String
  createdBy         User      @relation(fields: [createdById], references: [id])
  teamId            String?
  team              Team?     @relation(fields: [teamId], references: [id])
  isDefault         Boolean   @default(false)
  customerServiceWeight Int   @default(25)  // Percentage weight
  productKnowledgeWeight Int  @default(25)
  communicationSkillsWeight Int @default(25)
  complianceAdherenceWeight Int @default(25)
  requiredPhrases   String[]
  prohibitedPhrases String[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  recordings        Recording[]
}

// Update existing Recording model
model Recording {
  id             String           @id @default(cuid())
  title          String
  description    String?
  s3Key          String           @unique
  duration       Int?             // Duration in seconds
  fileSize       Int?             // Size in bytes
  fileType       String?
  uploadedById   String
  employeeId     String?          // New field
  teamId         String?
  criteriaId     String?          // New field
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  uploadedBy     User             @relation(fields: [uploadedById], references: [id], onDelete: Cascade)
  employee       Employee?        @relation(fields: [employeeId], references: [id])
  team           Team?            @relation(fields: [teamId], references: [id])
  criteria       QACriteria?      @relation(fields: [criteriaId], references: [id])
  transcription  Transcription?
  analysis       Analysis?
  scorecard      Scorecard?
  reviewStatus   ReviewStatus     @default(PENDING)
  reviewedById   String?
  reviewedBy     User?            @relation("ReviewedRecordings", fields: [reviewedById], references: [id])
  reviewNotes    String?
  reviewedAt     DateTime?
  
  @@index([employeeId, createdAt])
  @@index([uploadedById, createdAt])
  @@index([teamId, createdAt])
}

// New enum for review status
enum ReviewStatus {
  PENDING
  APPROVED
  NEEDS_REVISION
  REJECTED
}

// Update existing Transcription model
model Transcription {
  id          String    @id @default(cuid())
  recordingId String    @unique
  text        String    @db.Text
  status      Status    @default(PENDING)
  originalText String?   @db.Text  // Store original before edits
  editedAt    DateTime?
  editedById  String?
  editedBy    User?     @relation(fields: [editedById], references: [id])
  speakerMap  Json?     // Store speaker identities
  sections    Json?     // Store conversation sections
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  recording   Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
}

// New AuditLog model
model AuditLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  action      String    // e.g., "CREATE", "UPDATE", "DELETE", "VIEW"
  resource    String    // e.g., "Recording", "Employee", "User"
  resourceId  String
  details     Json      // Additional context about the action
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())
}

// New Notification model
model Notification {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String    // e.g., "REPORT_READY", "REVIEW_REQUESTED"
  title       String
  message     String
  read        Boolean   @default(false)
  actionUrl   String?
  createdAt   DateTime  @default(now())
}

// New NotificationPreference model
model NotificationPreference {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String    // Notification type
  email       Boolean   @default(true)
  inApp       Boolean   @default(true)
  
  @@unique([userId, type])
}

// New Webhook model
model Webhook {
  id          String    @id @default(cuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name        String
  url         String
  secret      String
  events      String[]  // Array of event types to trigger webhook
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### 2. Generate and Apply Migration

Run the following commands to create and apply the migration:

```bash
# Generate migration
npx prisma migrate dev --name add_employee_and_qa_models

# Apply migration to development database
npx prisma generate
```

## Authentication System Implementation

### 1. Create Admin Setup Script

Create a new file at `scripts/setup-admin.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'System Administrator';
  
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
  }
  
  console.log(`Setting up admin user: ${email}`);
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    return;
  }
  
  // Create admin user
  const hashedPassword = await hash(password, 10);
  
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      role: 'ADMIN',
      registrationStatus: 'APPROVED',
      password: hashedPassword,
    }
  });
  
  console.log('Admin user created successfully:', admin.email);
}

main()
  .catch(e => {
    console.error('Error setting up admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add the script to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "setup-admin": "ts-node scripts/setup-admin.ts"
}
```

### 2. Update S3 Utilities

Create or update `lib/s3.ts` with folder management functions:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_MANAGER_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_MANAGER_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file to S3
 */
export async function uploadToS3(file: File, key: string) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    },
  });

  return upload.done();
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Create a folder in S3 (folders in S3 are just objects with keys ending in '/')
 */
export async function createS3Folder(folderPath: string) {
  if (!folderPath.endsWith('/')) {
    folderPath = `${folderPath}/`;
  }
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: folderPath,
    Body: ''
  });
  
  return s3Client.send(command);
}

/**
 * Generate the S3 key for a recording based on company, employee, and file
 */
export function generateRecordingKey(companyFolder: string, employeeFolder: string, fileName: string) {
  return `companies/${companyFolder}/employees/${employeeFolder}/recordings/${Date.now()}-${fileName}`;
}
```

### 3. Add Utility Functions

Update `lib/utils.ts` with new utility functions:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a string for use as an S3 folder name
 */
export function sanitizeForS3(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const { db } = await import('@/lib/db');
    
    return db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logs should not block main functionality
  }
}
```

### 4. Create Registration Page

Create a new file at `app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          company: values.company,
          password: values.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      
      setSuccess("Registration successful! Your account is pending approval.");
      
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
```

### 5. Create Registration API Route

Create a new file at `app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { db } from "@/lib/db";
import { sanitizeForS3 } from "@/lib/utils";
import { createS3Folder } from "@/lib/s3";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, password, company } = await req.json();
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }
    
    // Check if company exists or create it
    let companyRecord = await db.company.findUnique({
      where: { name: company }
    });
    
    if (!companyRecord) {
      const s3FolderName = sanitizeForS3(company);
      
      companyRecord = await db.company.create({
        data: {
          name: company,
          s3FolderName
        }
      });
      
      // Create company folder in S3
      await createS3Folder(`companies/${s3FolderName}`);
    }
    
    // Create user with pending status
    const hashedPassword = await hash(password, 10);
    
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyId: companyRecord.id,
        registrationStatus: "PENDING"
      }
    });
    
    // Notify admins about new registration
    const admins = await db.user.findMany({
      where: { role: "ADMIN" }
    });
    
    for (const admin of admins) {
      if (admin.email) {
        await sendEmail({
          to: admin.email,
          subject: "New User Registration",
          text: `A new user has registered and is pending approval:\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\n\nPlease log in to approve or reject this registration.`
        });
        
        // Create notification for admin
        await db.notification.create({
          data: {
            userId: admin.id,
            type: "NEW_REGISTRATION",
            title: "New User Registration",
            message: `${name} (${email}) from ${company} has registered and is pending approval.`,
            actionUrl: "/admin/registrations"
          }
        });
      }
    }
    
    return NextResponse.json(
      { 
        success: true,
        message: "Registration successful. Your account is pending approval." 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
```

### 6. Update NextAuth Configuration

Update `lib/auth.ts` to include registration status check:

```typescript
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { compare } from "bcrypt";
import { createAuditLog } from "@/lib/utils";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }
        
        // Check if user is approved
        if (user.registrationStatus !== "APPROVED") {
          throw new Error("Your account is pending approval");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Log successful login
        await createAuditLog({
          userId: user.id,
          action: "LOGIN",
          resource: "AUTH",
          resourceId: user.id,
          details: { method: "credentials" },
          ipAddress: req?.headers?.["x-forwarded-for"] as string || "unknown",
          userAgent: req?.headers?.["user-agent"] as string || "unknown",
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
  },
  events: {
    async signOut({ token }) {
      if (token.id) {
        await createAuditLog({
          userId: token.id as string,
          action: "LOGOUT",
          resource: "AUTH",
          resourceId: token.id as string,
          details: {},
        });
      }
    },
  },
};
```

### 7. Create Admin Pending Registrations Component

Create a new file at `components/admin-pending-registrations.tsx`:

```tsx
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
  name: string;
  email: string;
  createdAt: string;
  company?: {
    id: string;
    name: string;
  };
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
```

### 8. Create Registration Approval API

Create a new file at `app/api/admin/registrations/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const pendingUsers = await db.user.findMany({
      where: { registrationStatus: "PENDING" },
      include: { company: true },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ users: pendingUsers });
  } catch (error) {
    console.error("Error fetching pending registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
```

Create a new file at `app/api/admin/registrations/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { action, message } = await req.json();
    
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
    
    const user = await db.user.findUnique({
      where: { id: params.id },
      include: { company: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: {
        registrationStatus: action === "APPROVE" ? "APPROVED" : "REJECTED"
      }
    });
    
    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: action === "APPROVE" ? "APPROVE_REGISTRATION" : "REJECT_REGISTRATION",
      resource: "USER",
      resourceId: user.id,
      details: { 
        userEmail: user.email,
        company: user.company?.name,
        rejectionReason: action === "REJECT" ? message : undefined
      }
    });
    
    // Send email notification to user
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: action === "APPROVE" 
          ? "Your account has been approved" 
          : "Your account registration status",
        text: action === "APPROVE"
          ? "Your account has been approved. You can now log in to the system."
          : `Your account registration has been rejected. Reason: ${message || "No reason provided"}`
      });
    }
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating registration:", error);
    return NextResponse.json(
      { error: "Failed to update registration" },
      { status: 500 }
    );
  }
}
```

### 9. Create Admin Dashboard Page

Create a new file at `app/(dashboard)/admin/page.tsx`:

```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminPendingRegistrations } from "@/components/admin-pending-registrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  // Get pending registrations
  const pendingUsers = await db.user.findMany({
    where: { registrationStatus: "PENDING" },
    include: { company: true },
    orderBy: { createdAt: "desc" }
  });
  
  // Get system stats
  const userCount = await db.user.count({
    where: { registrationStatus: "APPROVED" }
  });
  
  const companyCount = await db.company.count();
  
  const recordingCount = await db.recording.count();
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Admin Dashboard"
        text="Manage users, companies, and system settings."
      />
      
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companyCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recordings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recordingCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
            </CardContent>
          </Card>
        </div>
        
        <AdminPendingRegistrations initialUsers={pendingUsers} />
        
        {/* Other admin components will be added here */}
      </div>
    </DashboardShell>
  );
}
```

## Environment Setup

### 1. Update .env File

Add the following environment variables to your `.env` file:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/qa_dashboard"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# AWS S3
AWS_REGION="us-east-1"
AWS_MANAGER_ACCESS_KEY_ID="your-access-key"
AWS_MANAGER_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"

# Email
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@example.com"

# Assembly AI
ASSEMBLY_AI_API_KEY="your-assembly-ai-key"

# OpenAI
OPEN_AI_API_KEY="your-openai-key"

# Admin Setup
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-admin-password"
ADMIN_NAME="System Administrator"
```

### 2. Create Deployment Script

Create a new file at `scripts/deploy.sh`:

```bash
#!/bin/bash

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Set up admin user if not exists
echo "Setting up admin user..."
npm run setup-admin

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
npm run start
```

Make it executable:
```bash
chmod +x scripts/deploy.sh
```

## Next Steps

After completing the Phase 1 implementation, you should have:

1. An updated database schema with support for companies, employees, and QA criteria
2. A registration system with admin approval workflow
3. S3 folder structure for organizing recordings by company and employee
4. Basic admin dashboard for managing user registrations

The next phases will focus on:

1. Employee management UI and API
2. Enhanced recording upload with employee association
3. Transcript editing interface
4. QA criteria management
5. Report generation and analysis
