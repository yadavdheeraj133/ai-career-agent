/**
 * Database helpers for the API suite.
 *
 * `prisma` here is the same singleton the application uses — the test
 * environment redirects it at the `_test` database (see test/setup/env.ts).
 */
import { prisma } from "../../src/lib/prisma.js";
import { rm } from "node:fs/promises";

/**
 * Truncate every table between tests.
 *
 * Children are deleted before parents so the order stays correct even if
 * cascade behaviour changes; Job is independent of User and is cleared too,
 * otherwise its `url @unique` constraint would leak between tests.
 */
export async function resetDatabase(): Promise<void> {
  await rm("uploads/resumes", { recursive: true, force: true });
  await prisma.notification.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
