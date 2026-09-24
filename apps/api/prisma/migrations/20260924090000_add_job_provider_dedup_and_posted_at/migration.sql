-- Preserve the provider-supplied posting date where available.
ALTER TABLE "Job" ADD COLUMN "postedAt" TIMESTAMP(3);

-- A provider must never supply the same external job twice. NULLs are
-- distinct in PostgreSQL, so provider-less rows are unaffected.
CREATE UNIQUE INDEX "Job_provider_externalId_key" ON "Job"("provider", "externalId");
