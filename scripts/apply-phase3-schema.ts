import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying Phase 3 schema updates...');
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, '..', 'prisma', 'phase3_schema_updates.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split the SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Execute each statement
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(`${statement};`);
      console.log('Success!');
    } catch (error) {
      console.error(`Error executing statement: ${statement}`);
      console.error(error);
    }
  }
  
  console.log('Phase 3 schema updates applied successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
