import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[500px] text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
            404 - Page Not Found
          </h1>
          <p className="text-muted-foreground">
            The dashboard page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
