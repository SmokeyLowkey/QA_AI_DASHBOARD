import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting team criteria assignment migration...');

  try {
    // Apply the SQL migration directly
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20250504_add_team_criteria_assignment/migration.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL directly using Prisma's executeRaw
    console.log('Applying SQL migration...');
    await prisma.$executeRawUnsafe(migrationSql);
    
    console.log('SQL migration applied successfully');
    
    // Update the Prisma schema
    console.log('Updating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Migration script failed:', e);
    process.exit(1);
  });
