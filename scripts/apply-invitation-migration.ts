import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

/**
 * This script applies the invitation model migration
 * Run with: npx ts-node -r tsconfig-paths/register scripts/apply-invitation-migration.ts
 */
async function applyMigration() {
  try {
    console.log('Applying invitation model migration...');
    
    // Run the migration and generate the client
    const { stdout, stderr } = await execAsync('npx prisma migrate dev --name add_invitation_model');
    
    // Generate the Prisma client
    console.log('Generating Prisma client...');
    const { stdout: genStdout, stderr: genStderr } = await execAsync('npx prisma generate');
    
    if (genStderr) {
      console.error('Client generation stderr:', genStderr);
    }
    
    console.log('Client generation stdout:', genStdout);
    
    if (stderr) {
      console.error('Migration stderr:', stderr);
    }
    
    console.log('Migration stdout:', stdout);
    console.log('Migration completed successfully');
    
    // Note: We can't verify the Invitation model exists in this script
    // because the Prisma client needs to be reloaded after generation
    console.log('Migration and client generation completed successfully');
    console.log('Please restart your application to use the new Invitation model');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
