-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "avgTurnaroundDays" INTEGER,
ADD COLUMN     "ratingAvg" DECIMAL(3,2),
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulImports" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ResearchModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "specs" TEXT NOT NULL,
    "regTaxBdt" DECIMAL(14,2) NOT NULL,
    "tokenTaxBdt" DECIMAL(14,2) NOT NULL,
    "insuranceBdt" DECIMAL(14,2) NOT NULL,
    "fuelPricePerL" DECIMAL(8,2) NOT NULL,
    "kmPerL" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "ResearchModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchIssue" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ResearchIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchModel_slug_key" ON "ResearchModel"("slug");

-- AddForeignKey
ALTER TABLE "ResearchIssue" ADD CONSTRAINT "ResearchIssue_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ResearchModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
