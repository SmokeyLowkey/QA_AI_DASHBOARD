import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if authenticated, otherwise to login
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  // This won't be rendered, but is needed for TypeScript
  return null;
}
