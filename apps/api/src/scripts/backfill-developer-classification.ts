/**
 * Backfills `Job.isDeveloperJob` for rows that predate developer-only
 * classification.
 *
 * The column is nullable and new rows are classified during ingestion, so this
 * only has to cover history. It is deliberately non-destructive: every existing
 * job is kept and only its verdict is filled in, which is what lets Find Jobs
 * and Job Intelligence scope themselves without ever removing a record.
 *
 * Re-running is safe and idempotent: rows already carrying a verdict are left
 * untouched, so the classifier can be improved later without silently rewriting
 * the history it already judged.
 *
 *   pnpm --filter @repo/api exec tsx src/scripts/backfill-developer-classification.ts
 *   pnpm --filter @repo/api exec tsx src/scripts/backfill-developer-classification.ts -- --force
 */
import { isDeveloperJob } from "../automation/developer-classifier.js";
import { prisma } from "../lib/prisma.js";

const BATCH_SIZE = 500;

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  const rows = await prisma.job.findMany({
    where: force ? {} : { isDeveloperJob: null },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
      skills: true,
      source: true,
      isDeveloperJob: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `${force ? "Re-classifying" : "Classifying"} ${rows.length} job(s) with ${
      force ? "forced" : "unclassified"
    } rows included.`
  );

  const perSource = new Map<string, { developer: number; unrelated: number }>();

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);

    const verdicts = batch.map((row) =>
      isDeveloperJob({
        title: row.title,
        company: row.company,
        description: row.description ?? undefined,
        skills: row.skills,
      })
    );

    // One transaction per batch: a failure part-way through leaves previously
    // committed batches intact instead of rolling back hours of work.
    await prisma.$transaction(
      batch.map((row, index) =>
        prisma.job.update({
          where: { id: row.id },
          data: { isDeveloperJob: verdicts[index] },
        })
      )
    );

    for (const [index, row] of batch.entries()) {
      const source = row.source ?? "(no source)";
      const bucket = perSource.get(source) ?? { developer: 0, unrelated: 0 };
      if (verdicts[index]) bucket.developer++;
      else bucket.unrelated++;
      perSource.set(source, bucket);
    }

    console.log(
      `  ${Math.min(offset + batch.length, rows.length)}/${rows.length} processed.`
    );
  }

  let developer = 0;
  let unrelated = 0;
  for (const [source, bucket] of [...perSource.entries()].sort()) {
    console.log(
      `  ${source.padEnd(24)} developer=${String(bucket.developer).padStart(4)}  unrelated=${String(bucket.unrelated).padStart(4)}`
    );
    developer += bucket.developer;
    unrelated += bucket.unrelated;
  }

  const total = await prisma.job.count();
  console.log(
    `Done. developer=${developer} unrelated=${unrelated} (${total} job(s) still stored).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
