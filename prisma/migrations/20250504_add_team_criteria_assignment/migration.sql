-- Create TeamCriteriaAssignment table for many-to-many relationship
CREATE TABLE "TeamCriteriaAssignment" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "criteriaId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamCriteriaAssignment_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX "TeamCriteriaAssignment_teamId_criteriaId_key" ON "TeamCriteriaAssignment"("teamId", "criteriaId");

-- Add foreign key constraints
ALTER TABLE "TeamCriteriaAssignment" ADD CONSTRAINT "TeamCriteriaAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamCriteriaAssignment" ADD CONSTRAINT "TeamCriteriaAssignment_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "QACriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX "TeamCriteriaAssignment_teamId_idx" ON "TeamCriteriaAssignment"("teamId");
CREATE INDEX "TeamCriteriaAssignment_criteriaId_idx" ON "TeamCriteriaAssignment"("criteriaId");
