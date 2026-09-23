ALTER TABLE "Resume"
  ADD COLUMN "parsedProfile" JSONB,
  ADD COLUMN "rawText" TEXT,
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "storagePath" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "uploadedAt" TIMESTAMP(3);