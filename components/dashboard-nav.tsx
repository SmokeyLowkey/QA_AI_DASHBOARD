"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  adminOnly?: boolean;
}

interface DashboardNavProps {
  isAdmin?: boolean;
}

export function DashboardNav({ isAdmin = false }: DashboardNavProps) {
  const pathname = usePathname();
  
  // Define navigation items
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
    },
    {
      title: "Recordings",
      href: "/dashboard/recordings",
    },
    {
      title: "Employees",
      href: "/dashboard/employees",
    },
    {
      title: "Teams",
      href: "/dashboard/teams",
    },
    {
      title: "Criteria",
      href: "/dashboard/criteria",
    },
    {
      title: "Company Users",
      href: "/dashboard/company-users",
    },
    {
      title: "Admin",
      href: "/dashboard/admin",
      adminOnly: true,
    },
  ];

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        // Hide admin-only items for non-admin users
        if (item.adminOnly && !isAdmin) {
          return null;
        }
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              pathname === item.href
                ? "bg-muted hover:bg-muted"
                : "hover:bg-transparent hover:underline",
              "justify-start"
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
