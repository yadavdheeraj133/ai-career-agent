/**
 * Re-normalizes stored job rows onto the canonical field format.
 *
 * New records are normalized during ingestion. This script brings the rows
 * that predate that into the same shape, so the UI never shows a job whose
 * description is raw HTML or whose skills are an unfiltered tag dump.
 *
 * Design constraints, all enforced here rather than assumed:
 *
 *   - **No job is deleted or inserted.** Only existing rows are updated.
 *   - **Idempotent.** The canonical form is a fixed point, so a second run
 *     reports zero changes. `--force` exists only to print the same summary
 *     for a row that was already clean.
 *   - **Identity is never rewritten.** `url` is left exactly as stored so the
 *     unique constraint and every "Apply now" link keep working. A missing
 *     `externalId` is *recovered* from data already on the row (the Adzuna
 *     advert id inside the stored URL) and only when no other row already owns
 *     that id, which restores the `provider + externalId` dedup key without
 *     risking a collision.
 *   - **No classification or matching input is touched.** `isDeveloperJob`,
 *     `status`, bookmarks and applications are outside the update payload.
 *
 * Usage:
 *   pnpm --filter @repo/api exec tsx src/scripts/backfill-job-normalization.ts
 *   pnpm --filter @repo/api exec tsx src/scripts/backfill-job-normalization.ts -- --dry-run
 */
import { prisma } from "../lib/prisma.js";
import {
  renormalizeJobRow,
  recoverExternalId,
  type RenormalizableJob,
} from "../automation/renormalize.js";

const BATCH_SIZE = 200;

/** The only columns this script is allowed to write. */
const FIELD_COLUMNS = [
  "title",
  "company",
  "location",
  "workMode",
  "jobType",
  "experience",
  "salary",
  "description",
  "skills",
  "source",
] as const;

interface Stats {
  scanned: number;
  changed: number;
  unchanged: number;
  externalIdRecovered: number;
  externalIdSkippedCollision: number;
  perField: Map<string, number>;
  perSource: Map<string, { changed: number; total: number }>;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  const rows = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      workMode: true,
      jobType: true,
      experience: true,
      salary: true,
      description: true,
      skills: true,
      source: true,
      url: true,
      provider: true,
      externalId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `${dryRun ? "Dry run: normalizing" : "Normalizing"} ${rows.length} job(s).${
      force ? " Forcing a rewrite of already-clean rows." : ""
    }`
  );

  // Ids already taken, so a recovered externalId can never collide with a row
  // that legitimately owns it.
  const takenIds = new Set(
    (
      await prisma.job.findMany({
        where: { externalId: { not: null } },
        select: { provider: true, externalId: true },
      })
    ).map((row) => `${row.provider ?? ""}::${row.externalId}`)
  );

  const stats: Stats = {
    scanned: rows.length,
    changed: 0,
    unchanged: 0,
    externalIdRecovered: 0,
    externalIdSkippedCollision: 0,
    perField: new Map(),
    perSource: new Map(),
  };

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);

    const updates: {
      id: string;
      data: Record<string, unknown>;
      changedFields: string[];
    }[] = [];

    for (const row of batch) {
      const record = row as unknown as RenormalizableJob;
      const result = renormalizeJobRow(record);

      const data: Record<string, unknown> = {};
      for (const field of result.changedFields) {
        if ((FIELD_COLUMNS as readonly string[]).includes(field)) {
          data[field] = result.fields[field as keyof typeof result.fields];
        }
      }

      // Identity repair is independent of the display-field diff.
      const identityKey = `${row.provider ?? ""}::${recoverExternalId({
        provider: row.provider,
        externalId: row.externalId,
        url: row.url,
      })}`;
      if (!row.externalId) {
        const recovered = recoverExternalId({
          provider: row.provider,
          externalId: row.externalId,
          url: row.url,
        });
        if (recovered && row.provider) {
          if (takenIds.has(identityKey)) {
            stats.externalIdSkippedCollision++;
          } else {
            data.externalId = recovered;
            takenIds.add(identityKey);
            stats.externalIdRecovered++;
          }
        }
      }

      const hasWrite = Object.keys(data).length > 0;
      if (!hasWrite && !force) {
        stats.unchanged++;
        const bucket = stats.perSource.get(row.source) ?? { changed: 0, total: 0 };
        bucket.total++;
        stats.perSource.set(row.source, bucket);
        continue;
      }

      for (const field of result.changedFields) {
        stats.perField.set(field, (stats.perField.get(field) ?? 0) + 1);
      }
      stats.changed++;
      const bucket = stats.perSource.get(row.source) ?? { changed: 0, total: 0 };
      bucket.changed++;
      bucket.total++;
      stats.perSource.set(row.source, bucket);

      if (!dryRun && hasWrite) {
        updates.push({ id: row.id, data, changedFields: result.changedFields });
      }
    }

    if (updates.length > 0) {
      // One transaction per batch: a mid-run failure leaves earlier batches
      // committed instead of rolling back the whole backfill.
      await prisma.$transaction(
        updates.map((update) => prisma.job.update({ where: { id: update.id }, data: update.data }))
      );
    }

    console.log(
      `  ${Math.min(offset + batch.length, rows.length)}/${rows.length} processed.`
    );
  }

  console.log("");
  console.log(`Rows scanned      ${stats.scanned}`);
  console.log(`Rows changed      ${stats.changed}`);
  console.log(`Rows unchanged    ${stats.unchanged}`);
  console.log(`externalId filled ${stats.externalIdRecovered}`);
  if (stats.externalIdSkippedCollision > 0) {
    console.log(
      `externalId skipped (id already owned by another row): ${stats.externalIdSkippedCollision}`
    );
  }

  if (stats.perField.size > 0) {
    console.log("");
    console.log("Changed fields:");
    for (const [field, count] of [...stats.perField.entries()].sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${field.padEnd(12)} ${count}`);
    }
  }

  console.log("");
  console.log("By source:");
  for (const [source, bucket] of [...stats.perSource.entries()].sort()) {
    console.log(
      `  ${source.padEnd(24)} changed=${String(bucket.changed).padStart(4)} of ${bucket.total}`
    );
  }

  // The backfill must never change how many jobs are stored.
  const total = await prisma.job.count();
  console.log("");
  console.log(
    `Done. ${total} job(s) stored, ${stats.scanned} scanned.` +
      (total === stats.scanned ? " Row count unchanged." : " ROW COUNT CHANGED - investigate.")
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
