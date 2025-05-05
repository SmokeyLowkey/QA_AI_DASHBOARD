"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeCsvImport } from "@/components/employee-csv-import";
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
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <EmployeeCsvImport onSuccess={() => router.refresh()} />
          <Button onClick={() => router.push("/dashboard/employees/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
