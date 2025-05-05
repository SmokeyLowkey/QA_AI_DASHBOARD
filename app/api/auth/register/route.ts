import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { db } from "@/lib/db";
import { sanitizeForS3 } from "@/lib/utils";
import { createS3Folder } from "@/lib/s3";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, password, company: companyName, invitation } = await req.json();
    
    // Validate input
    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Check if there's an invitation token
    let invitationRecord = null;
    let company = companyName; // Use a mutable variable for company name
    
    if (invitation) {
      try {
        // Since the Prisma client might not be updated yet, use a raw query
        const invitations = await db.$queryRaw`
          SELECT i.*, t.id as "teamId", t."companyId", c.name as "companyName"
          FROM "Invitation" i
          JOIN "Team" t ON i."teamId" = t.id
          JOIN "Company" c ON t."companyId" = c.id
          WHERE i.token = ${invitation}
        `;
        
        if (invitations && Array.isArray(invitations) && invitations.length > 0) {
          invitationRecord = invitations[0];
        }
        
        if (!invitationRecord) {
          return NextResponse.json(
            { error: "Invalid invitation token" },
            { status: 400 }
          );
        }
        
        if (invitationRecord.accepted) {
          return NextResponse.json(
            { error: "Invitation has already been used" },
            { status: 400 }
          );
        }
        
        const expiresAt = new Date(invitationRecord.expiresAt);
        if (expiresAt < new Date()) {
          return NextResponse.json(
            { error: "Invitation has expired" },
            { status: 400 }
          );
        }
        
        if (invitationRecord.email !== email) {
          return NextResponse.json(
            { error: "Invitation was sent to a different email address" },
            { status: 400 }
          );
        }
        
        // If invitation is valid, use the company from the team's company
        if (invitationRecord.companyName) {
          // Override the company with the one from the invitation
          company = invitationRecord.companyName;
        }
      } catch (error) {
        console.error("Error checking invitation:", error);
        // Continue with registration even if invitation check fails
      }
    }
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }
    
    // Check if company exists or create it
    let companyRecord = await db.company.findUnique({
      where: { name: company }
    });
    
    if (!companyRecord) {
      // Generate a unique s3FolderName by adding a timestamp
      const baseFolderName = sanitizeForS3(company);
      const s3FolderName = `${baseFolderName}-${Date.now()}`;
      
      try {
        companyRecord = await db.company.create({
          data: {
            name: company,
            s3FolderName,
            description: `Company for ${name}`,
          }
        });
        
        // Create company folder in S3
        try {
          await createS3Folder(`companies/${s3FolderName}`);
          console.log(`Created company: ${company} with folder: ${s3FolderName}`);
        } catch (s3Error) {
          console.warn("Warning: Could not create S3 folder. This is not critical for local development.");
          console.warn("S3 error:", s3Error);
          // Continue with registration even if S3 folder creation fails
        }
      } catch (error) {
        console.error("Error creating company:", error);
        
        // Check if it's a unique constraint error from Prisma
        if (
          typeof error === 'object' && 
          error !== null && 
          'code' in error && 
          error.code === 'P2002'
        ) {
          return NextResponse.json(
            { error: "Company registration failed. Please try again." },
            { status: 400 }
          );
        }
        
        throw error;
      }
    }
    
    // Check if this is the first user for this company
    const existingUsersCount = await db.user.count({
      where: {
        companyId: companyRecord.id
      }
    });
    
    // Determine role based on whether this is the first user for the company
    const role = existingUsersCount === 0 ? "MANAGER" : "USER";
    
    // Create user with pending status
    const hashedPassword = await hash(password, 10);
    
    const userData = {
      name,
      email,
      password: hashedPassword,
      companyId: companyRecord.id,
      role: role as "USER" | "MANAGER" | "ADMIN",
      // If user is invited, set status to APPROVED, otherwise PENDING
      registrationStatus: (invitationRecord ? "APPROVED" : "PENDING") as "APPROVED" | "PENDING" | "REJECTED"
    };
    
    const user = await db.user.create({
      data: userData
    });
    
    console.log(`Created user with role: ${role} (${existingUsersCount} existing users for company)`);
    
    // If user was invited, add them to the team and mark invitation as accepted
    if (invitationRecord) {
      try {
        // Add user to team with the role specified in the invitation
        await db.teamMember.create({
          data: {
            userId: user.id,
            teamId: invitationRecord.teamId,
            role: invitationRecord.role === "MANAGER" ? "MANAGER" : "MEMBER"
          }
        });
        
        // Mark invitation as accepted using raw query
        await db.$executeRaw`
          UPDATE "Invitation"
          SET accepted = true
          WHERE id = ${invitationRecord.id}
        `;
        
        console.log(`Added user to team ${invitationRecord.teamId} with role ${invitationRecord.role}`);
      } catch (error) {
        console.error("Error processing invitation:", error);
        // Continue with registration even if team assignment fails
      }
    }
    
    // Notify admins about new registration
    try {
      const admins = await db.user.findMany({
        where: { role: "ADMIN" }
      });
      
      // Get email domain from environment variable
      const emailDomain = process.env.RESEND_DOMAIN || "qainsight.digital";
      
      for (const admin of admins) {
        if (admin.email) {
          try {
            await sendEmail({
              to: admin.email,
              from: `Registration <registration@${emailDomain}>`,
              subject: "New User Registration",
              text: `A new user has registered and is pending approval:

Name: ${name}
Email: ${email}
Company: ${company}

Please log in to approve or reject this registration.`
            });
            console.log(`Sent notification email to admin: ${admin.email}`);
          } catch (emailError) {
            console.warn(`Warning: Could not send email to admin ${admin.email}:`, emailError);
            // Continue even if email sending fails
          }
          
          // Create notification for admin
          try {
            await db.notification.create({
              data: {
                userId: admin.id,
                type: "NEW_REGISTRATION",
                title: "New User Registration",
                message: `${name} (${email}) from ${company} has registered and is pending approval.`,
                actionUrl: "/admin/registrations"
              }
            });
            console.log(`Created notification for admin: ${admin.email}`);
          } catch (notificationError) {
            console.warn(`Warning: Could not create notification for admin ${admin.email}:`, notificationError);
            // Continue even if notification creation fails
          }
        }
      }
    } catch (adminError) {
      console.warn("Warning: Could not notify admins about new registration:", adminError);
      // Continue with registration even if admin notification fails
    }
    
    // Log the registration
    console.log(`New user registered: ${email} (${name}) from ${company}`);
    
    return NextResponse.json(
      { 
        success: true,
        message: "Registration successful. Your account is pending approval." 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
