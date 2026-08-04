-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "achievements" JSONB,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'modern';
