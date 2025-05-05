import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { action, message } = await req.json();
    
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
    
    const user = await db.user.findUnique({
      where: { id: params.id },
      include: { company: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: {
        registrationStatus: action === "APPROVE" ? "APPROVED" : "REJECTED"
      }
    });
    
    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: action === "APPROVE" ? "APPROVE_REGISTRATION" : "REJECT_REGISTRATION",
      resource: "USER",
      resourceId: user.id,
      details: { 
        userEmail: user.email,
        company: user.company?.name,
        rejectionReason: action === "REJECT" ? message : undefined
      }
    });
    
    // Send email notification to user
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: action === "APPROVE" 
          ? "Your account has been approved" 
          : "Your account registration status",
        text: action === "APPROVE"
          ? "Your account has been approved. You can now log in to the system."
          : `Your account registration has been rejected. ${message ? `Reason: ${message}` : "No reason provided."}`
      });
    }
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating registration:", error);
    return NextResponse.json(
      { error: "Failed to update registration" },
      { status: 500 }
    );
  }
}
