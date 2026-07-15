-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'ORGANIZATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('SUBMITTED', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'OFFER_RECEIVED', 'SOLD');

-- CreateEnum
CREATE TYPE "AccidentStatus" AS ENUM ('NONE_FOUND', 'ONE_INCIDENT', 'NOT_CHECKED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('PENDING', 'LIVE', 'SOLD', 'NO_SALE');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PartCategory" AS ENUM ('WHEELS', 'BODY_KIT', 'INTERIOR', 'LIGHTING');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('AUCTION_WIN', 'USED_CAR', 'NEW_CAR', 'MODIFICATION');

-- CreateEnum
CREATE TYPE "Gateway" AS ENUM ('SSLCOMMERZ', 'BKASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'HELD_IN_ESCROW', 'RELEASED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('WIN_CONFIRMED', 'PAYMENT_RECEIVED', 'COLLECTED_JP', 'VESSEL_DEPARTED', 'IN_TRANSIT', 'ARRIVED_CTG', 'CUSTOMS_CLEARANCE', 'READY_FOR_DELIVERY');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('OPEN', 'FULL', 'DEPARTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BroadcastKind" AS ENUM ('VIDEO', 'YOUTUBE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "yearsInOperation" INTEGER NOT NULL,
    "about" TEXT,
    "feeType" "FeeType" NOT NULL,
    "feeValue" DECIMAL(12,2) NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewCar" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "priceMinBdt" DECIMAL(14,2) NOT NULL,
    "priceMaxBdt" DECIMAL(14,2) NOT NULL,
    "warrantyYears" INTEGER NOT NULL,
    "warrantyKm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewCarVariant" (
    "id" TEXT NOT NULL,
    "newCarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceBdt" DECIMAL(14,2) NOT NULL,
    "engine" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "economyKmPerL" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "NewCarVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerInquiry" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedCarListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "manufactureYear" INTEGER NOT NULL,
    "mileageKm" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "priceBdt" DECIMAL(14,2) NOT NULL,
    "conditionNotes" TEXT NOT NULL,
    "inspectionNotes" TEXT,
    "ownershipVerified" BOOLEAN NOT NULL DEFAULT false,
    "accidentStatus" "AccidentStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedCarListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amountBdt" DECIMAL(14,2) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "house" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionCar" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "manufactureYear" INTEGER NOT NULL,
    "mileageKm" INTEGER NOT NULL,
    "engineCc" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "startingPriceJpy" DECIMAL(14,2) NOT NULL,
    "reservePriceJpy" DECIMAL(14,2),
    "durationSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "LotStatus" NOT NULL DEFAULT 'PENDING',
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "winningBidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionCarId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amountJpy" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "auctionCarId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "auctionCarId" TEXT,
    "targetCar" TEXT NOT NULL,
    "budgetCeilingBdt" DECIMAL(14,2),
    "status" "EngagementStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "auctionCarId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" "PartCategory" NOT NULL,
    "priceBdt" DECIMAL(14,2) NOT NULL,
    "brtaLegal" BOOLEAN NOT NULL DEFAULT true,
    "boltPattern" TEXT,
    "offsetMm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartFitment" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "chassisCode" TEXT NOT NULL,

    CONSTRAINT "PartFitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigCar" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "chassisCode" TEXT,

    CONSTRAINT "ConfigCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rim" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceBdt" DECIMAL(14,2) NOT NULL,
    "configCarId" TEXT,

    CONSTRAINT "Rim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spoiler" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceBdt" DECIMAL(14,2) NOT NULL,
    "configCarId" TEXT,

    CONSTRAINT "Spoiler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedBuild" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "configCarId" TEXT NOT NULL,
    "paintHex" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "rimId" TEXT,
    "spoilerId" TEXT,
    "totalBdt" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "gateway" "Gateway" NOT NULL,
    "amountBdt" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayTxnId" TEXT,
    "gatewayRef" TEXT,
    "auctionCarId" TEXT,
    "usedCarListingId" TEXT,
    "newCarVariantId" TEXT,
    "savedBuildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "disputeWindowEndsAt" TIMESTAMP(3),

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "auctionCarId" TEXT NOT NULL,
    "stage" "ShipmentStage" NOT NULL DEFAULT 'WIN_CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stage" "ShipmentStage" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "originPort" TEXT NOT NULL,
    "destinationPort" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "sizeClass" TEXT,
    "status" "ContainerStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerBooking" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "auctionCarId" TEXT NOT NULL,
    "communication" INTEGER NOT NULL,
    "gradingAccuracy" INTEGER NOT NULL,
    "timeliness" INTEGER NOT NULL,
    "overallValue" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "auctionCarId" TEXT,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyRate" (
    "id" TEXT NOT NULL,
    "ccMin" INTEGER NOT NULL,
    "ccMax" INTEGER,
    "ratePercent" DECIMAL(6,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "url" TEXT,
    "kind" "BroadcastKind" NOT NULL DEFAULT 'VIDEO',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "updatedByAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_userId_key" ON "Buyer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_userId_key" ON "Organization"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_licenseNumber_key" ON "Organization"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionCar_winningBidId_key" ON "AuctionCar"("winningBidId");

-- CreateIndex
CREATE INDEX "AuctionCar_auctionId_status_idx" ON "AuctionCar"("auctionId", "status");

-- CreateIndex
CREATE INDEX "Bid_auctionCarId_amountJpy_idx" ON "Bid"("auctionCarId", "amountJpy" DESC);

-- CreateIndex
CREATE INDEX "Bid_auctionCarId_bidderId_idx" ON "Bid"("auctionCarId", "bidderId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_buyerId_auctionCarId_key" ON "Wishlist"("buyerId", "auctionCarId");

-- CreateIndex
CREATE UNIQUE INDEX "Engagement_buyerId_organizationId_auctionCarId_key" ON "Engagement"("buyerId", "organizationId", "auctionCarId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_auctionCarId_buyerId_organizationId_key" ON "Conversation"("auctionCarId", "buyerId", "organizationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartFitment_partId_chassisCode_key" ON "PartFitment"("partId", "chassisCode");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigCar_slug_key" ON "ConfigCar"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayTxnId_key" ON "Payment"("gatewayTxnId");

-- CreateIndex
CREATE INDEX "Payment_payerId_status_idx" ON "Payment"("payerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_paymentId_key" ON "Escrow"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_auctionCarId_key" ON "Shipment"("auctionCarId");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_at_idx" ON "ShipmentEvent"("shipmentId", "at");

-- CreateIndex
CREATE INDEX "Container_originPort_departureDate_status_idx" ON "Container"("originPort", "departureDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerBooking_shipmentId_key" ON "ContainerBooking"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainerBooking_containerId_shipmentId_key" ON "ContainerBooking"("containerId", "shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_buyerId_auctionCarId_key" ON "Rating"("buyerId", "auctionCarId");

-- CreateIndex
CREATE UNIQUE INDEX "DutyRate_ccMin_ccMax_key" ON "DutyRate"("ccMin", "ccMax");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_key" ON "ExchangeRate"("base", "quote");

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_auctionId_key" ON "Broadcast"("auctionId");

-- AddForeignKey
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewCarVariant" ADD CONSTRAINT "NewCarVariant_newCarId_fkey" FOREIGN KEY ("newCarId") REFERENCES "NewCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInquiry" ADD CONSTRAINT "DealerInquiry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInquiry" ADD CONSTRAINT "DealerInquiry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "NewCarVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedCarListing" ADD CONSTRAINT "UsedCarListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedCarListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionCar" ADD CONSTRAINT "AuctionCar_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionCar" ADD CONSTRAINT "AuctionCar_winningBidId_fkey" FOREIGN KEY ("winningBidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartFitment" ADD CONSTRAINT "PartFitment_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rim" ADD CONSTRAINT "Rim_configCarId_fkey" FOREIGN KEY ("configCarId") REFERENCES "ConfigCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spoiler" ADD CONSTRAINT "Spoiler_configCarId_fkey" FOREIGN KEY ("configCarId") REFERENCES "ConfigCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_configCarId_fkey" FOREIGN KEY ("configCarId") REFERENCES "ConfigCar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_rimId_fkey" FOREIGN KEY ("rimId") REFERENCES "Rim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_spoilerId_fkey" FOREIGN KEY ("spoilerId") REFERENCES "Spoiler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_usedCarListingId_fkey" FOREIGN KEY ("usedCarListingId") REFERENCES "UsedCarListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_newCarVariantId_fkey" FOREIGN KEY ("newCarVariantId") REFERENCES "NewCarVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_savedBuildId_fkey" FOREIGN KEY ("savedBuildId") REFERENCES "SavedBuild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerBooking" ADD CONSTRAINT "ContainerBooking_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerBooking" ADD CONSTRAINT "ContainerBooking_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerBooking" ADD CONSTRAINT "ContainerBooking_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_auctionCarId_fkey" FOREIGN KEY ("auctionCarId") REFERENCES "AuctionCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
