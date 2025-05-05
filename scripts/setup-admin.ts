import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'System Administrator';
  
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
  }
  
  console.log(`Setting up admin user: ${email}`);
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    return;
  }
  
  // Create admin user
  const hashedPassword = await hash(password, 10);
  
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      role: 'ADMIN',
      registrationStatus: 'APPROVED',
      password: hashedPassword,
    }
  });
  
  console.log('Admin user created successfully:', admin.email);
}

main()
  .catch(e => {
    console.error('Error setting up admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
