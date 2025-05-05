import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { id } = params;
    const { role } = await req.json();

    // Validate role
    if (!["ADMIN", "MANAGER", "USER"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationStatus: true,
        createdAt: true,
        image: true,
        company: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: `UPDATE_USER_ROLE`,
        resource: "USER",
        resourceId: id,
        details: {
          role,
          userId: id,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_ROLE_UPDATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
