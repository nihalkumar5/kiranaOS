-- CreateTable
CREATE TABLE "CashTally" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tallyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAmount" DECIMAL(12,2) NOT NULL,
    "actualAmount" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashTally_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashTally_storeId_idx" ON "CashTally"("storeId");

-- CreateIndex
CREATE INDEX "CashTally_tallyDate_idx" ON "CashTally"("tallyDate");

-- AddForeignKey
ALTER TABLE "CashTally" ADD CONSTRAINT "CashTally_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTally" ADD CONSTRAINT "CashTally_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
