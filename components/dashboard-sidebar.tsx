"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  BarChart, 
  Users, 
  Headphones, 
  Settings, 
  ClipboardCheck, 
  FileText, 
  Shield, 
  UserCog,
  Building,
  PieChart
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarSeparator
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  role: "ADMIN" | "MANAGER" | "USER";
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();
  
  return (
    <Sidebar className="bg-gradient-to-b from-gray-900 to-black text-white border-r border-gray-800 shadow-xl">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-6">
          <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-lg font-bold text-white">QA</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Dashboard</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Admin Dashboard - For creators and maintainers of the web app */}
        {role === "ADMIN" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2">Administration</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/dashboard"}
                    tooltip="Dashboard"
                    className={pathname === "/dashboard" 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard">
                      <BarChart className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/dashboard/admin"}
                    tooltip="Admin Panel"
                    className={pathname === "/dashboard/admin" 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/users")}
                    tooltip="User Management"
                    className={pathname.startsWith("/dashboard/users") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/users">
                      <UserCog className="h-4 w-4" />
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/company-users")}
                    tooltip="Company Users"
                    className={pathname.startsWith("/dashboard/company-users") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/company-users">
                      <Users className="h-4 w-4" />
                      <span>Company Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2 mt-4">System</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/logs")}
                    tooltip="System Logs"
                    className={pathname.startsWith("/dashboard/logs") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/logs">
                      <FileText className="h-4 w-4" />
                      <span>System Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
        
        {/* Manager Dashboard */}
        {role === "MANAGER" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2">Overview</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/dashboard"}
                    tooltip="Dashboard"
                    className={pathname === "/dashboard" 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard">
                      <BarChart className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/recordings")}
                    tooltip="Recordings"
                    className={pathname.startsWith("/dashboard/recordings") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/recordings">
                      <Headphones className="h-4 w-4" />
                      <span>Recordings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2 mt-4">Evaluation</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/criteria")}
                    tooltip="Criteria"
                    className={pathname.startsWith("/dashboard/criteria") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/criteria">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Criteria</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/employees")}
                    tooltip="Employees"
                    className={pathname.startsWith("/dashboard/employees") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/employees">
                      <Users className="h-4 w-4" />
                      <span>Employees</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/reports")}
                    tooltip="Reports"
                    className={pathname.startsWith("/dashboard/reports") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/reports">
                      <FileText className="h-4 w-4" />
                      <span>Reports</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/analytics")}
                    tooltip="Analytics"
                    className={pathname.startsWith("/dashboard/analytics") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/analytics">
                      <PieChart className="h-4 w-4" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2 mt-4">Management</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/teams")}
                    tooltip="Teams"
                    className={pathname.startsWith("/dashboard/teams") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/teams">
                      <Building className="h-4 w-4" />
                      <span>Teams</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/company-users")}
                    tooltip="Company Users"
                    className={pathname.startsWith("/dashboard/company-users") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/company-users">
                      <Users className="h-4 w-4" />
                      <span>Company Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/team-performance")}
                    tooltip="Team Performance"
                    className={pathname.startsWith("/dashboard/team-performance") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/team-performance">
                      <BarChart className="h-4 w-4" />
                      <span>Team Performance</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
        
        {/* User Dashboard */}
        {role === "USER" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2">Overview</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/dashboard"}
                    tooltip="Dashboard"
                    className={pathname === "/dashboard" 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard">
                      <BarChart className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/recordings")}
                    tooltip="Recordings"
                    className={pathname.startsWith("/dashboard/recordings") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/recordings">
                      <Headphones className="h-4 w-4" />
                      <span>Recordings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider px-4 py-2 mt-4">Evaluation</SidebarGroupLabel>
              <SidebarMenu className="px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith("/dashboard/criteria")}
                    tooltip="Criteria"
                    className={pathname.startsWith("/dashboard/criteria") 
                      ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
                  >
                    <Link href="/dashboard/criteria">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Criteria</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      
      <SidebarSeparator />
      
      <SidebarFooter className="mt-auto pb-6">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/dashboard/settings"}
              tooltip="Settings"
              className={pathname === "/dashboard/settings" 
                ? "bg-blue-600 text-white rounded-md transition-all duration-200" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200"}
            >
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
