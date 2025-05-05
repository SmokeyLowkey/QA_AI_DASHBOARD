"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Upload, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ImportResult {
  message: string;
  results: {
    success: number;
    errors: Array<{
      row: number;
      error: string;
    }>;
  };
}

export function EmployeeCsvImport({ onSuccess }: { onSuccess?: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import employees");
      }

      setResult(data);
      
      toast({
        title: "Import complete",
        description: data.message,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import employees",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after dialog closes
    setTimeout(resetForm, 300);
  };

  const downloadTemplate = () => {
    const csvContent = "name,email,position,department,employeeId,hireDate\nJohn Doe,john.doe@example.com,Sales Representative,Sales,EMP001,2023-01-15\nJane Smith,jane.smith@example.com,Customer Support,Support,EMP002,2023-02-20";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Employees
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with employee data. The file should have the following columns: name, email, position, department (optional), employeeId (optional), hireDate (optional).
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="gap-2 justify-self-start"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right col-span-1">
              CSV File
            </Label>
            <div className="col-span-3">
              <Input
                id="file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          </div>
          
          {file && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>File selected</AlertTitle>
              <AlertDescription>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}
          
          {result && (
            <div className="mt-4 space-y-4">
              <Alert variant={result.results.errors.length > 0 ? "destructive" : "default"}>
                {result.results.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>Import Results</AlertTitle>
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>
              
              {result.results.errors.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.results.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload and Import"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
