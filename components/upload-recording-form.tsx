"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Upload, X } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/m4a",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  employeeId: z.string({
    required_error: "Please select an employee.",
  }),
  criteriaId: z.string().optional(),
  file: z
    .any()
    .refine((file) => file?.size > 0, "File is required")
    .refine(
      (file) => file?.size <= MAX_FILE_SIZE,
      "File size must be less than 500MB"
    )
    .refine(
      (file) => ACCEPTED_AUDIO_TYPES.includes(file?.type),
      "File must be an audio or video file"
    ),
});

interface Employee {
  id: string;
  name: string;
  employeeId: string | null;
  department: string | null;
  position: string | null;
}

interface Criteria {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface UploadRecordingFormProps {
  employees: Employee[];
  criteria: Criteria[];
  selectedEmployeeId?: string;
}

export function UploadRecordingForm({ 
  employees, 
  criteria, 
  selectedEmployeeId 
}: UploadRecordingFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      employeeId: selectedEmployeeId || "",
      criteriaId: criteria.find(c => c.isDefault)?.id || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      form.setValue("file", file);
      
      // Auto-fill title with filename if title is empty
      if (!form.getValues("title")) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        form.setValue("title", fileName);
      }
    } else {
      form.setValue("file", null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    form.setValue("file", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description || "");
      formData.append("employeeId", values.employeeId);
      if (values.criteriaId) {
        formData.append("criteriaId", values.criteriaId);
      }
      formData.append("file", values.file);
      
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(uploadInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      
      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(uploadInterval);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload recording");
      }
      
      setUploadProgress(100);
      
      const data = await response.json();
      
      toast({
        title: "Recording uploaded",
        description: "Your recording has been uploaded successfully.",
      });
      
      router.push(`/dashboard/recordings/${data.recording.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload recording",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Call with customer" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive title for this recording.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                        {employee.employeeId && ` (${employee.employeeId})`}
                        {employee.position && ` - ${employee.position}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The employee featured in this recording.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the call or interaction"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Additional context about this recording (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {criteria.length > 0 && (
          <FormField
            control={form.control}
            name="criteriaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>QA Criteria</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select QA criteria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Default Criteria</SelectItem>
                    {criteria.map((criterion) => (
                      <SelectItem key={criterion.id} value={criterion.id}>
                        {criterion.name}
                        {criterion.isDefault && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The criteria to use for evaluating this recording (optional).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Recording File</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept={ACCEPTED_AUDIO_TYPES.join(",")}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className={selectedFile ? "hidden" : ""}
                  />
                  
                  {selectedFile && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 truncate">
                              <p className="text-sm font-medium">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an audio or video file (max 500MB).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUploading || !selectedFile}>
            {isUploading ? "Uploading..." : "Upload Recording"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
