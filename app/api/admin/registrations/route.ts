import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const pendingUsers = await db.user.findMany({
      where: { registrationStatus: "PENDING" },
      include: { company: true },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ users: pendingUsers });
  } catch (error) {
    console.error("Error fetching pending registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
