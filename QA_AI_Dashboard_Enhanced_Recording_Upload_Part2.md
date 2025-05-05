# QA AI Dashboard - Enhanced Recording Upload Implementation (Part 2)

This document continues the implementation instructions for the enhanced recording upload features of the QA AI Dashboard project.

## 3. Complete Upload Recording Form (continued)

Continue the file at `components/upload-recording-form.tsx`:

```tsx
                {/* Display selected files for bulk upload */}
                {bulkForm.watch("files").length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Selected Files ({bulkForm.watch("files").length})</div>
                    <div className="max-h-60 overflow-y-auto rounded-md border p-2">
                      {bulkForm.watch("files").map((file, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileAudio className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading {bulkForm.watch("files").length} files...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-end">
          {activeTab === "single" ? (
            <Button
              type="submit"
              onClick={singleForm.handleSubmit(onSingleSubmit)}
              disabled={isUploading || !singleForm.formState.isValid}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Recording
                </>
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              onClick={bulkForm.handleSubmit(onBulkSubmit)}
              disabled={isUploading || !bulkForm.formState.isValid || bulkForm.watch("files").length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {bulkForm.watch("files").length} Recordings
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
```

## 4. Update Recording Upload Page

Update the file at `app/(dashboard)/dashboard/recordings/new/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { UploadRecordingForm } from "@/components/upload-recording-form";

interface NewRecordingPageProps {
  searchParams: {
    employeeId?: string;
  };
}

export default async function NewRecordingPage({ searchParams }: NewRecordingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get user's company
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });

  // Get teams for the user's company
  const teams = await db.team.findMany({
    where: {
      companyId: user?.companyId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get employees for the user's company
  const employees = await db.employee.findMany({
    where: {
      companyId: user?.companyId,
    },
    select: {
      id: true,
      name: true,
      position: true,
      employeeId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Verify employeeId if provided
  let preselectedEmployeeId = searchParams.employeeId;
  if (preselectedEmployeeId) {
    const employee = await db.employee.findUnique({
      where: { 
        id: preselectedEmployeeId,
        companyId: user?.companyId, // Ensure employee belongs to user's company
      },
    });

    if (!employee) {
      preselectedEmployeeId = undefined;
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Upload Recording"
        text="Upload an audio recording for analysis."
      />
      <div className="grid gap-6">
        <UploadRecordingForm 
          teams={teams} 
          employees={employees}
          preselectedEmployeeId={preselectedEmployeeId}
        />
      </div>
    </DashboardShell>
  );
}
```

## 5. Update Recordings Table Component

Update the file at `components/recordings-table.tsx` to show employee information:

```tsx
// Add employee information to the columns definition
export const columns: ColumnDef<Recording>[] = [
  // ... existing columns
  
  // Add employee column
  {
    accessorKey: "employee",
    header: "Employee",
    cell: ({ row }) => {
      const employee = row.original.employee;
      return employee ? (
        <div>
          <Link
            href={`/dashboard/employees/${employee.id}`}
            className="font-medium hover:underline"
          >
            {employee.name}
          </Link>
          {employee.employeeId && (
            <div className="text-xs text-muted-foreground">
              ID: {employee.employeeId}
            </div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  
  // ... other columns
];
```

## 6. Update Recording Detail Component

Update the file at `components/recording-detail.tsx` to show employee information:

```tsx
// Add employee information to the recording detail
export function RecordingDetail({ recording, audioUrl }: RecordingDetailProps) {
  // ... existing code
  
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            <span className="text-sm text-muted-foreground">
              Uploaded {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RecordingStatus recording={recording} />
            
            {/* Add employee badge if available */}
            {recording.employee && (
              <Badge variant="outline">
                <Link href={`/dashboard/employees/${recording.employee.id}`} className="hover:underline">
                  {recording.employee.name}
                </Link>
              </Badge>
            )}
          </div>
        </div>
        
        {/* ... existing buttons */}
      </div>
      
      {/* ... rest of the component */}
    </div>
  );
}
```

## 7. Create Employee Recordings Page

Create a new file at `app/(dashboard)/dashboard/employees/[id]/recordings/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { RecordingsTable } from "@/components/recordings-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload } from "lucide-react";

interface EmployeeRecordingsPageProps {
  params: {
    id: string;
  };
}

export default async function EmployeeRecordingsPage({ params }: EmployeeRecordingsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  const employee = await db.employee.findUnique({
    where: { id: params.id },
  });

  if (!employee) {
    notFound();
  }

  // Check if user has access to this employee
  if (session.user.role !== "ADMIN") {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    });

    if (user?.companyId !== employee.companyId) {
      notFound();
    }
  }

  // Get recordings for this employee
  const recordings = await db.recording.findMany({
    where: { employeeId: params.id },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      employee: {
        select: {
          id: true,
          name: true,
          position: true,
          employeeId: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <DashboardShell>
      <DashboardHeader
        heading={`${employee.name}'s Recordings`}
        text={`Manage recordings for ${employee.name}`}
      >
        <Button asChild>
          <Link href={`/dashboard/recordings/new?employeeId=${employee.id}`}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Recording
          </Link>
        </Button>
      </DashboardHeader>
      
      <RecordingsTable data={recordings} />
    </DashboardShell>
  );
}
```

## 8. Implementation Steps

1. **Update S3 Utilities**:
   - Add the `generateRecordingKey` function to `lib/s3.ts`
   - Test the function with different company and employee folder names

2. **Update Recording API**:
   - Modify the existing `app/api/recordings/route.ts` file
   - Add employee association logic
   - Test the API with Postman or similar tool

3. **Create Bulk Upload API**:
   - Create the new `app/api/recordings/bulk/route.ts` file
   - Test the API with multiple files

4. **Update Upload Form**:
   - Modify the existing `components/upload-recording-form.tsx` file
   - Add the bulk upload tab and functionality
   - Test both single and bulk upload

5. **Update Recording Pages**:
   - Update the recording upload page
   - Update the recordings table to show employee information
   - Update the recording detail page to show employee information
   - Create the employee recordings page

6. **Testing**:
   - Test employee association during upload
   - Test bulk upload functionality
   - Verify S3 folder structure
   - Test employee recordings page

## 9. Next Steps

After implementing the enhanced recording upload features, the next phase should focus on:

1. **Transcript Editing Interface**:
   - Create a UI for editing transcripts
   - Add speaker identification
   - Implement timeline view with audio synchronization

2. **QA Criteria Management**:
   - Create UI for defining evaluation criteria
   - Implement criteria templates
   - Add criteria selection during analysis

3. **Report Generation**:
   - Enhance analysis with employee-specific metrics
   - Create trend analysis for employees
   - Implement comparative reporting
