-- CreateTable
CREATE TABLE "ListingThread" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderBuyerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingThread_listingId_buyerId_key" ON "ListingThread"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "ListingMessage_threadId_createdAt_idx" ON "ListingMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingThread" ADD CONSTRAINT "ListingThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedCarListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingThread" ADD CONSTRAINT "ListingThread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMessage" ADD CONSTRAINT "ListingMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ListingThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMessage" ADD CONSTRAINT "ListingMessage_senderBuyerId_fkey" FOREIGN KEY ("senderBuyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
