/*
  Warnings:

  - Changed the type of `installationId` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "installationId",
ADD COLUMN     "installationId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_installationId_key" ON "User"("installationId");
