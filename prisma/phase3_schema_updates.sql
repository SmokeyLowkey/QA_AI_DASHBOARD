-- Phase 3 Schema Updates

-- Add isPublic field to QACriteria
ALTER TABLE "QACriteria" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- Add contextNotes field to Transcription
ALTER TABLE "Transcription" ADD COLUMN "contextNotes" TEXT;

-- Create QACategory table
CREATE TABLE "QACategory" (
  "id" TEXT NOT NULL,
  "criteriaId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "weight" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QACategory_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for QACategory
CREATE UNIQUE INDEX "QACategory_criteriaId_name_key" ON "QACategory"("criteriaId", "name");

-- Add foreign key for QACategory
ALTER TABLE "QACategory" ADD CONSTRAINT "QACategory_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "QACriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create QAMetric table
CREATE TABLE "QAMetric" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "weight" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "scaleMin" INTEGER,
  "scaleMax" INTEGER,
  "scaleLabels" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QAMetric_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for QAMetric
CREATE UNIQUE INDEX "QAMetric_categoryId_name_key" ON "QAMetric"("categoryId", "name");

-- Add foreign key for QAMetric
ALTER TABLE "QAMetric" ADD CONSTRAINT "QAMetric_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QACategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create TranscriptSegment table
CREATE TABLE "TranscriptSegment" (
  "id" TEXT NOT NULL,
  "transcriptionId" TEXT NOT NULL,
  "startTime" DOUBLE PRECISION NOT NULL,
  "endTime" DOUBLE PRECISION NOT NULL,
  "text" TEXT NOT NULL,
  "speakerId" TEXT,
  "confidence" DOUBLE PRECISION,
  "edited" BOOLEAN NOT NULL DEFAULT false,
  "sectionType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- Add index for TranscriptSegment
CREATE INDEX "TranscriptSegment_transcriptionId_startTime_idx" ON "TranscriptSegment"("transcriptionId", "startTime");

-- Add foreign key for TranscriptSegment
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
