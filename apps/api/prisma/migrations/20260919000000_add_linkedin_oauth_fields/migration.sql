-- AlterTable: Make password optional and add LinkedIn OAuth fields
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: Add LinkedIn OAuth columns
ALTER TABLE "User" ADD COLUMN "provider" TEXT,
ADD COLUMN "providerId" TEXT,
ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex: Unique constraint for (provider, providerId)
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
