-- CreateEnum
CREATE TYPE "CartItemKind" AS ENUM ('NEW_CAR', 'USED_CAR', 'RECONDITIONED', 'MODIFICATION');

-- CreateEnum
CREATE TYPE "CartItemStatus" AS ENUM ('IN_CART', 'PAID');

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "kind" "CartItemKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "amountBdt" DECIMAL(14,2) NOT NULL,
    "status" "CartItemStatus" NOT NULL DEFAULT 'IN_CART',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_buyerId_status_idx" ON "CartItem"("buyerId", "status");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
