/*
  Warnings:

  - You are about to drop the column `brand` on the `NewCar` table. All the data in the column will be lost.
  - Added the required column `brandId` to the `NewCar` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TestDriveStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "DealerInquiry" ADD COLUMN     "dealerId" TEXT;

-- AlterTable
ALTER TABLE "NewCar" DROP COLUMN "brand",
ADD COLUMN     "brandId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestDriveReservation" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "newCarId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "TestDriveStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestDriveReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Dealer_brandId_idx" ON "Dealer"("brandId");

-- CreateIndex
CREATE INDEX "TestDriveReservation_dealerId_scheduledAt_idx" ON "TestDriveReservation"("dealerId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestDriveReservation_buyerId_newCarId_dealerId_scheduledAt_key" ON "TestDriveReservation"("buyerId", "newCarId", "dealerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "NewCar_brandId_idx" ON "NewCar"("brandId");

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewCar" ADD CONSTRAINT "NewCar_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInquiry" ADD CONSTRAINT "DealerInquiry_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestDriveReservation" ADD CONSTRAINT "TestDriveReservation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestDriveReservation" ADD CONSTRAINT "TestDriveReservation_newCarId_fkey" FOREIGN KEY ("newCarId") REFERENCES "NewCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestDriveReservation" ADD CONSTRAINT "TestDriveReservation_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
