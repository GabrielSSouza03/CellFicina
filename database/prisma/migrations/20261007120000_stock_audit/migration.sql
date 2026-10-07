-- AlterTable
ALTER TABLE "Product" ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 0;

-- RedefineTable
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL,
    "previousStock" INTEGER NOT NULL DEFAULT 0,
    "resultingStock" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "originType" TEXT NOT NULL DEFAULT 'MANUAL',
    "originId" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "documentNumber" TEXT,
    "userId" TEXT,
    "supplierId" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_StockMovement" ("id", "productId", "type", "quantity", "unitCost", "reason", "reference", "originId", "createdAt", "updatedAt", "occurredAt")
SELECT
    "id",
    "productId",
    CASE "type" WHEN 'ENTRY' THEN 'ENTRADA' WHEN 'EXIT' THEN 'SAIDA' ELSE "type" END,
    "quantity",
    "unitCost",
    "reason",
    "reference",
    "reference",
    "createdAt",
    "updatedAt",
    "createdAt"
FROM "StockMovement";

DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";

CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");
CREATE INDEX "StockMovement_originType_idx" ON "StockMovement"("originType");
CREATE INDEX "StockMovement_originId_idx" ON "StockMovement"("originId");
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX "StockMovement_occurredAt_idx" ON "StockMovement"("occurredAt");
CREATE INDEX "StockMovement_productId_occurredAt_idx" ON "StockMovement"("productId", "occurredAt");
CREATE INDEX "StockMovement_originType_originId_idx" ON "StockMovement"("originType", "originId");

PRAGMA foreign_keys=ON;
