-- Classify stored jobs as developer-relevant so ingestion can decide once, at
-- write time, and read paths (Find Jobs, Job Intelligence) can filter in SQL.
--
-- The column is nullable on purpose: every existing row keeps a NULL verdict,
-- so this migration neither rewrites nor deletes historical data. The backfill
-- in `src/scripts/backfill-developer-classification.ts` fills the column in
-- afterwards, and any row that predates ingestion is simply not surfaced as
-- developer-relevant until it is re-classified.
ALTER TABLE "Job" ADD COLUMN "isDeveloperJob" BOOLEAN;

CREATE INDEX "Job_isDeveloperJob_status_idx" ON "Job" ("isDeveloperJob", "status");
