-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "UsedCarListing" ADD COLUMN     "auctionSheetUrl" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "engineCc" INTEGER,
ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "registrationYear" INTEGER,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "transmission" TEXT;
