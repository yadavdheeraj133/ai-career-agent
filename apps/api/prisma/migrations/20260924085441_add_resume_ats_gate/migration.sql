-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "atsCheckedAt" TIMESTAMP(3),
ADD COLUMN     "atsResult" JSONB,
ADD COLUMN     "atsScore" INTEGER;
