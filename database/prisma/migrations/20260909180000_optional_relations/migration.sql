PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "chassis" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("id", "customerId", "plate", "brand", "model", "version", "year", "mileage", "chassis", "color", "notes", "createdAt", "updatedAt")
SELECT "id", "customerId", "plate", "brand", "model", "version", "year", "mileage", "chassis", "color", "notes", "createdAt", "updatedAt" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "mechanicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "mileage" INTEGER,
    "diagnosis" TEXT,
    "notes" TEXT,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" DATETIME,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "surcharge" DECIMAL NOT NULL DEFAULT 0,
    "servicesTotal" DECIMAL NOT NULL DEFAULT 0,
    "partsTotal" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "quoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("id", "number", "customerId", "vehicleId", "mechanicId", "status", "mileage", "diagnosis", "notes", "entryDate", "deliveryDate", "discount", "surcharge", "servicesTotal", "partsTotal", "subtotal", "total", "quoteId", "createdAt", "updatedAt")
SELECT "id", "number", "customerId", "vehicleId", "mechanicId", "status", "mileage", "diagnosis", "notes", "entryDate", "deliveryDate", "discount", "surcharge", "servicesTotal", "partsTotal", "subtotal", "total", "quoteId", "createdAt", "updatedAt" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE UNIQUE INDEX "WorkOrder_number_key" ON "WorkOrder"("number");
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX "WorkOrder_vehicleId_idx" ON "WorkOrder"("vehicleId");
CREATE INDEX "WorkOrder_entryDate_idx" ON "WorkOrder"("entryDate");
CREATE INDEX "WorkOrder_quoteId_idx" ON "WorkOrder"("quoteId");
CREATE INDEX "WorkOrder_mechanicId_idx" ON "WorkOrder"("mechanicId");

CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" DATETIME,
    "notes" TEXT,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "surcharge" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("id", "number", "customerId", "vehicleId", "status", "validUntil", "notes", "discount", "surcharge", "subtotal", "total", "createdAt", "updatedAt")
SELECT "id", "number", "customerId", "vehicleId", "status", "validUntil", "notes", "discount", "surcharge", "subtotal", "total", "createdAt", "updatedAt" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Quote_vehicleId_idx" ON "Quote"("vehicleId");

PRAGMA foreign_keys=ON;
