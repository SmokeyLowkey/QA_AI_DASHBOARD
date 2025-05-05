import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserAccountNav } from "@/components/user-account-nav";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }
  
  // Map session role to our component's expected roles
  const role = session.user.role === "ADMIN" 
    ? "ADMIN" 
    : session.user.role === "MANAGER" 
      ? "MANAGER" 
      : "USER";

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex min-h-screen dark:bg-gray-950">
        <SidebarProvider>
          <DashboardSidebar role={role} />
          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-40 border-b bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative hidden md:block">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input 
                    type="search" 
                    className="block w-64 p-2 pl-10 text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Search..." 
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <ModeToggle />
                
                {/* Notification Bell */}
                <button className="relative p-2 text-gray-600 dark:text-gray-300 transition-colors duration-200 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">3</span>
                </button>
                
                {/* Help Button */}
                <button className="p-2 text-gray-600 dark:text-gray-300 transition-colors duration-200 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                {/* User Account Nav */}
                <UserAccountNav
                  user={{
                    name: session.user.name,
                    image: session.user.image,
                    email: session.user.email,
                    role: session.user.role,
                  }}
                />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
    </ThemeProvider>
  );
}
