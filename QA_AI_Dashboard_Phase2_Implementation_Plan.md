# QA AI Dashboard - Phase 2 Implementation Plan

This document provides detailed implementation instructions for Phase 2 of the QA AI Dashboard project, focusing on employee management and enhanced recording upload features.

## Employee Management Implementation

### 1. Create Employee Management API Routes

Create a new file at `app/api/employees/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createS3Folder } from "@/lib/s3";
import { sanitizeForS3, createAuditLog } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    const teamId = url.searchParams.get("teamId");
    const search = url.searchParams.get("search");

    // Build filter conditions
    const where: any = {};

    // If user is not an admin, they can only see employees from their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (!user?.companyId) {
        return NextResponse.json({ error: "User has no company" }, { status: 400 });
      }

      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            recordings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, department, position, employeeId, hireDate, teamId } = await req.json();

    // Get user's company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    });

    if (!user?.company) {
      return NextResponse.json(
        { error: "User does not belong to a company" },
        { status: 400 }
      );
    }

    // Check if employee with same ID already exists in this company
    if (employeeId) {
      const existingEmployee = await db.employee.findFirst({
        where: {
          companyId: user.company.id,
          employeeId,
        }
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this ID already exists in your company" },
          { status: 400 }
        );
      }
    }

    // Create sanitized folder name
    const s3FolderName = sanitizeForS3(`${employeeId || name}-${Date.now()}`);
    
    // Create employee record
    const employee = await db.employee.create({
      data: {
        name,
        email,
        department,
        position,
        employeeId,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        teamId: teamId || undefined,
        companyId: user.company.id,
        s3FolderName
      }
    });

    // Create S3 folder for employee
    const folderPath = `companies/${user.company.s3FolderName}/employees/${s3FolderName}`;
    await createS3Folder(folderPath);
    
    // Also create recordings subfolder
    await createS3Folder(`${folderPath}/recordings`);

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: name,
        employeeEmail: email,
        companyId: user.company.id,
        companyName: user.company.name
      }
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
```

Create a new file at `app/api/employees/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        team: true,
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get performance metrics
    const performanceMetrics = await db.performanceMetric.findMany({
      where: { employeeId: params.id },
      orderBy: { period: "desc" },
      take: 12, // Last 12 periods
    });

    // Get recent recordings
    const recentRecordings = await db.recording.findMany({
      where: { employeeId: params.id },
      include: {
        transcription: {
          select: {
            id: true,
            status: true,
          },
        },
        analysis: {
          select: {
            id: true,
            status: true,
          },
        },
        scorecard: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      employee,
      performanceMetrics,
      recentRecordings,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, department, position, employeeId, hireDate, teamId } = await req.json();

    // Get the employee
    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: { company: true }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Check if employee ID is being changed and if it would conflict
    if (employeeId && employeeId !== employee.employeeId) {
      const existingEmployee = await db.employee.findFirst({
        where: {
          companyId: employee.companyId,
          employeeId,
          id: { not: params.id }, // Exclude current employee
        }
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this ID already exists in your company" },
          { status: 400 }
        );
      }
    }

    // Update employee
    const updatedEmployee = await db.employee.update({
      where: { id: params.id },
      data: {
        name,
        email,
        department,
        position,
        employeeId,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        teamId: teamId || undefined,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: name,
        employeeEmail: email,
        companyId: employee.companyId,
        companyName: employee.company.name
      }
    });

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the employee
    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: { company: true }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Check if employee has recordings
    const recordingsCount = await db.recording.count({
      where: { employeeId: params.id }
    });

    if (recordingsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete employee with recordings. Reassign or delete recordings first." },
        { status: 400 }
      );
    }

    // Delete employee
    await db.employee.delete({
      where: { id: params.id }
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: employee.name,
        employeeEmail: employee.email,
        companyId: employee.companyId,
        companyName: employee.company.name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
```

Create a new file at `app/api/employees/[id]/recordings/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await db.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get recordings
    const recordings = await db.recording.findMany({
      where: { employeeId: params.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transcription: {
          select: {
            id: true,
            status: true,
          },
        },
        analysis: {
          select: {
            id: true,
            status: true,
          },
        },
        scorecard: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Get total count
    const total = await db.recording.count({
      where: { employeeId: params.id },
    });

    return NextResponse.json({
      recordings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employee recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}
```

### 2. Create Employee Form Component

Create a new file at `components/employee-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal('')),
  department: z.string().optional(),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  hireDate: z.date().optional(),
  teamId: z.string().optional(),
});

interface Team {
  id: string;
  name: string;
}

interface EmployeeFormProps {
  teams: Team[];
  initialData?: any;
  isEditing?: boolean;
}

export function EmployeeForm({ teams, initialData, isEditing = false }: EmployeeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      department: initialData?.department || "",
      position: initialData?.position || "",
      employeeId: initialData?.employeeId || "",
      hireDate: initialData?.hireDate ? new Date(initialData.hireDate) : undefined,
      teamId: initialData?.teamId || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      
      const url = isEditing 
        ? `/api/employees/${initialData.id}`
        : "/api/employees";
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      
      toast({
        title: isEditing ? "Employee updated" : "Employee created",
        description: isEditing 
          ? "The employee has been updated successfully."
          : "The employee has been created successfully.",
      });
      
      router.push(isEditing 
        ? `/dashboard/employees/${initialData.id}`
        : "/dashboard/employees"
      );
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormDescription>
                The employee's full name.
              </FormDescription>
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
                <Input placeholder="john.doe@example.com" type="email" {...field} value={field.value || ''} />
              </FormControl>
              <FormDescription>
                The employee's email address (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Sales" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="Sales Representative" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="EMP-001" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>
                  A unique identifier for this employee.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Hire Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {teams.length > 0 && (
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assign this employee to a team (optional).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Employee" : "Create Employee"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 3. Create Employee List Component

Create a new file at `components/employees-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  position: string | null;
  employeeId: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
  _count: {
    recordings: number;
  };
}

export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <Link
          href={`/dashboard/employees/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue("name")}
        </Link>
        {row.original.employeeId && (
          <div className="text-xs text-muted-foreground">
            ID: {row.original.employeeId}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => (
      <div>
        <div>{row.getValue("position") || "—"}</div>
        {row.original.department && (
          <div className="text-xs text-muted-foreground">
            {row.original.department}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "team",
    header: "Team",
    cell: ({ row }) => {
      const team = row.original.team;
      return team ? (
        <Badge variant="outline">{team.name}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "recordings",
    header: "Recordings",
    cell: ({ row }) => row.original._count.recordings,
  },
  {
    accessorKey: "createdAt",
    header: "Added",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/employees/${employee.id}`}>
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/employees/${employee.id}/edit`}>
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/recordings/new?employeeId=${employee.id}`}>
                Upload Recording
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface EmployeesTableProps {
  data: Employee[];
}

export function EmployeesTable({ data }: EmployeesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const router = useRouter();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter employees..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue
