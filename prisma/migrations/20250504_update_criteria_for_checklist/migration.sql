-- Add checklistItems field to QACriteria model
ALTER TABLE "QACriteria" ADD COLUMN "checklistItems" JSONB;

-- Create a default structure for existing criteria
UPDATE "QACriteria" SET "checklistItems" = '[]';
