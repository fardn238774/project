-- CreateTable
CREATE TABLE "MarketPrice" (
    "id" TEXT NOT NULL,
    "researchModelId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'bikroy',
    "sampleCount" INTEGER NOT NULL,
    "minPriceBdt" INTEGER NOT NULL,
    "avgPriceBdt" INTEGER NOT NULL,
    "maxPriceBdt" INTEGER NOT NULL,
    "samples" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL,
    "researchModelId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceBdt" INTEGER NOT NULL,
    "intervalKm" INTEGER,
    "note" TEXT,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketPrice_researchModelId_key" ON "MarketPrice"("researchModelId");

-- AddForeignKey
ALTER TABLE "MarketPrice" ADD CONSTRAINT "MarketPrice_researchModelId_fkey" FOREIGN KEY ("researchModelId") REFERENCES "ResearchModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceItem" ADD CONSTRAINT "MaintenanceItem_researchModelId_fkey" FOREIGN KEY ("researchModelId") REFERENCES "ResearchModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
