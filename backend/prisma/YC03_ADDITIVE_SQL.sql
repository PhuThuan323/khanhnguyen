-- GARAGE OS YC03 - non-destructive PostgreSQL / Supabase upgrade.
-- Make a database backup and test a staging project first.
-- Existing YC02/Prisma database required. Does not delete previous owner approval columns.
BEGIN;
CREATE TABLE IF NOT EXISTS "VehicleDocument" (
  "id" TEXT PRIMARY KEY,
  "carId" TEXT NOT NULL UNIQUE REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'WITHDRAWING',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "destinationProvince" TEXT NOT NULL,
  "cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "VehicleDocument_status_updatedAt_idx" ON "VehicleDocument" ("status", "updatedAt");
-- Supabase Data API must not expose financial/customer data directly.
ALTER TABLE public."VehicleDocument" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."VehicleDocument" FROM anon, authenticated;
COMMIT;
