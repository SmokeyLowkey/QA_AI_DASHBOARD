import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background h-14 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">QA AI Dashboard</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        {children}
      </main>
      <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} QA AI Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
}
