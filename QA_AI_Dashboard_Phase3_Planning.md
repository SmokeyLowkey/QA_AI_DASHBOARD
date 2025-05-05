# QA AI Dashboard - Phase 3 Planning

This document outlines the planning for Phase 3 of the QA AI Dashboard project, focusing on the transcript editing interface and QA criteria management.

## 1. Transcript Editing Interface

The transcript editing interface will allow users to edit AI-generated transcripts for accuracy, add speaker labels, and mark sections for analysis.

### 1.1 Key Features

- **Timeline View**: Synchronized audio playback with transcript
- **Speaker Identification**: Add and edit speaker labels
- **Content Editing**: Correct transcription errors
- **Section Marking**: Identify different parts of the conversation (greeting, discovery, etc.)
- **Context Notes**: Add notes for the AI analyzer

### 1.2 Database Updates

Update the Transcription model to store additional information:

```prisma
model Transcription {
  id            String    @id @default(cuid())
  recordingId   String    @unique
  text          String    @db.Text
  status        Status    @default(PENDING)
  originalText  String?   @db.Text  // Store original before edits
  editedAt      DateTime?
  editedById    String?
  editedBy      User?     @relation(fields: [editedById], references: [id])
  speakerMap    Json?     // Store speaker identities
  sections      Json?     // Store conversation sections
  contextNotes  String?   @db.Text  // Notes for analysis
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  recording     Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
}

// New model for transcript segments
model TranscriptSegment {
  id              String    @id @default(cuid())
  transcriptionId String
  transcription   Transcription @relation(fields: [transcriptionId], references: [id], onDelete: Cascade)
  startTime       Float     // Start time in seconds
  endTime         Float     // End time in seconds
  text            String    @db.Text
  speakerId       String?   // Reference to speaker in speakerMap
  confidence      Float?    // Confidence score from AI
  edited          Boolean   @default(false)
  sectionType     String?   // e.g., "greeting", "discovery", "closing"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([transcriptionId, startTime])
}
```

### 1.3 API Routes

Create the following API routes:

```
/api/recordings/[id]/transcript
  - GET: Get the full transcript with segments
  - PUT: Update the transcript metadata (speakers, sections)

/api/recordings/[id]/transcript/segments
  - GET: Get all segments for a transcript
  - POST: Create a new segment

/api/recordings/[id]/transcript/segments/[segmentId]
  - PUT: Update a segment
  - DELETE: Delete a segment
```

### 1.4 UI Components

#### 1.4.1 TranscriptEditor Component

Create a new file at `components/transcript-editor.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Play, Pause, SkipBack, SkipForward, Save, Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Component implementation with audio player, timeline, and segment editing
```

#### 1.4.2 SpeakerManager Component

Create a new file at `components/speaker-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Component for managing speakers in the transcript
```

#### 1.4.3 SectionMarker Component

Create a new file at `components/section-marker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Component for marking sections in the transcript
```

### 1.5 Transcript Editing Page

Create a new file at `app/(dashboard)/dashboard/recordings/[id]/edit-transcript/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/s3";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { TranscriptEditor } from "@/components/transcript-editor";

// Page for editing a transcript
```

## 2. QA Criteria Management

The QA criteria management interface will allow managers to define evaluation criteria for quality assurance.

### 2.1 Key Features

- **Criteria Builder**: Create and edit evaluation categories
- **Scoring System**: Define scoring metrics and weights
- **Templates**: Save criteria sets as templates
- **Compliance Configuration**: Define required disclosures and compliance checks

### 2.2 Database Updates

The QACriteria model is already defined in Phase 1, but we'll add more detail:

```prisma
// Add more detail to QACriteria model
model QACriteria {
  id                      String    @id @default(cuid())
  name                    String
  description             String?
  createdById             String
  createdBy               User      @relation(fields: [createdById], references: [id])
  teamId                  String?
  team                    Team?     @relation(fields: [teamId], references: [id])
  isDefault               Boolean   @default(false)
  isPublic                Boolean   @default(false)  // Can be used by other teams
  customerServiceWeight   Int       @default(25)  // Percentage weight
  productKnowledgeWeight  Int       @default(25)
  communicationSkillsWeight Int     @default(25)
  complianceAdherenceWeight Int     @default(25)
  requiredPhrases         String[]
  prohibitedPhrases       String[]
  categories              QACategory[]
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  recordings              Recording[]
}

// New model for QA categories
model QACategory {
  id            String    @id @default(cuid())
  criteriaId    String
  criteria      QACriteria @relation(fields: [criteriaId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  weight        Int       // Percentage weight within criteria
  metrics       QAMetric[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([criteriaId, name])
}

// New model for QA metrics
model QAMetric {
  id            String    @id @default(cuid())
  categoryId    String
  category      QACategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  weight        Int       // Percentage weight within category
  type          String    // "boolean", "scale", "text"
  scaleMin      Int?      // For scale type
  scaleMax      Int?      // For scale type
  scaleLabels   Json?     // Labels for scale points
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([categoryId, name])
}
```

### 2.3 API Routes

Create the following API routes:

```
/api/criteria
  - GET: List all criteria templates
  - POST: Create a new criteria template

/api/criteria/[id]
  - GET: Get criteria details
  - PUT: Update criteria
  - DELETE: Delete criteria

/api/criteria/[id]/categories
  - GET: Get all categories for criteria
  - POST: Create a new category

/api/criteria/[id]/categories/[categoryId]
  - PUT: Update a category
  - DELETE: Delete a category

/api/criteria/[id]/categories/[categoryId]/metrics
  - GET: Get all metrics for a category
  - POST: Create a new metric

/api/criteria/[id]/categories/[categoryId]/metrics/[metricId]
  - PUT: Update a metric
  - DELETE: Delete a metric
```

### 2.4 UI Components

#### 2.4.1 CriteriaForm Component

Create a new file at `components/criteria-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Component for creating and editing QA criteria
```

#### 2.4.2 CategoryBuilder Component

Create a new file at `components/category-builder.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash, MoveUp, MoveDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Component for building QA categories
```

#### 2.4.3 MetricBuilder Component

Create a new file at `components/metric-builder.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Component for building QA metrics
```

#### 2.4.4 PhraseManager Component

Create a new file at `components/phrase-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Component for managing required and prohibited phrases
```

### 2.5 QA Criteria Pages

#### 2.5.1 Criteria List Page

Create a new file at `app/(dashboard)/dashboard/criteria/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

// Page for listing QA criteria templates
```

#### 2.5.2 Create Criteria Page

Create a new file at `app/(dashboard)/dashboard/criteria/new/page.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { CriteriaForm } from "@/components/criteria-form";

// Page for creating a new QA criteria template
```

#### 2.5.3 Edit Criteria Page

Create a new file at `app/(dashboard)/dashboard/criteria/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { CriteriaForm } from "@/components/criteria-form";

// Page for editing a QA criteria template
```

## 3. Implementation Steps

### 3.1 Transcript Editing Implementation

1. **Database Updates**:
   - Add new fields to Transcription model
   - Create TranscriptSegment model
   - Generate and apply migration

2. **API Implementation**:
   - Create transcript API routes
   - Implement segment management
   - Add speaker and section management

3. **UI Components**:
   - Build TranscriptEditor component
   - Create SpeakerManager component
   - Implement SectionMarker component

4. **Page Integration**:
   - Create transcript editing page
   - Connect to audio playback
   - Implement save functionality

### 3.2 QA Criteria Implementation

1. **Database Updates**:
   - Enhance QACriteria model
   - Create QACategory model
   - Create QAMetric model
   - Generate and apply migration

2. **API Implementation**:
   - Create criteria API routes
   - Implement category management
   - Add metric management

3. **UI Components**:
   - Build CriteriaForm component
   - Create CategoryBuilder component
   - Implement MetricBuilder component
   - Build PhraseManager component

4. **Page Integration**:
   - Create criteria list page
   - Implement create criteria page
   - Build edit criteria page

## 4. Testing Strategy

### 4.1 Transcript Editing Testing

- Test audio synchronization with transcript
- Verify speaker identification functionality
- Test content editing and saving
- Validate section marking
- Test context notes

### 4.2 QA Criteria Testing

- Test criteria creation and editing
- Verify category and metric management
- Test scoring weight calculations
- Validate template functionality
- Test phrase management

## 5. Next Steps

After completing Phase 3, the project will move to Phase 4, which will focus on:

- Enhanced analysis with QA criteria integration
- Report generation based on transcript analysis
- Manager review workflow
- Performance tracking and trend analysis

Phase 3 lays the groundwork for these features by providing the necessary tools for transcript editing and QA criteria definition.
