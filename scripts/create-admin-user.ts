import { hash } from "bcrypt";
import { db } from "../lib/db";
import { sanitizeForS3 } from "../lib/utils";
import { createS3Folder } from "../lib/s3";

/**
 * This script creates an admin user directly in the database
 * Run with: npx ts-node -r tsconfig-paths/register scripts/create-admin-user.ts
 */
async function createAdminUser() {
  try {
    console.log("Creating admin user...");
    
    const email = "admin@example.com";
    const password = "Admin123!";
    const name = "System Administrator";
    const company = "System";
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log("Admin user already exists");
      
      // Update user to ADMIN role and APPROVED status if needed
      if (existingUser.role !== "ADMIN" || existingUser.registrationStatus !== "APPROVED") {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            role: "ADMIN",
            registrationStatus: "APPROVED"
          }
        });
        console.log("Updated existing user to ADMIN role and APPROVED status");
      }
      
      return;
    }
    
    // Check if company exists or create it
    let companyRecord = await db.company.findUnique({
      where: { name: company }
    });
    
    if (!companyRecord) {
      const s3FolderName = sanitizeForS3(company);
      
      try {
        companyRecord = await db.company.create({
          data: {
            name: company,
            s3FolderName,
            description: `System company for ${name}`,
          }
        });
        
        // Create company folder in S3
        try {
          await createS3Folder(`companies/${s3FolderName}`);
          console.log(`Created company folder in S3: companies/${s3FolderName}`);
        } catch (s3Error) {
          console.warn("Warning: Could not create S3 folder. This is not critical for local development.");
          console.warn("S3 error:", s3Error);
        }
        
        console.log(`Created company: ${company} with folder: ${s3FolderName}`);
      } catch (companyError) {
        console.error("Error creating company:", companyError);
        throw companyError;
      }
    }
    
    // Create admin user
    const hashedPassword = await hash(password, 10);
    
    try {
      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          companyId: companyRecord.id,
          role: "ADMIN",
          registrationStatus: "APPROVED"
        }
      });
      
      console.log(`Created admin user: ${email} (${name})`);
      console.log("Admin user details:", {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.registrationStatus
      });
      
      console.log("\nYou can now log in with:");
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    } catch (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }
  } catch (error) {
    console.error("Failed to create admin user:", error);
  } finally {
    await db.$disconnect();
  }
}

createAdminUser();
