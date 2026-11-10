-- GARAGE OS YC02 - additive schema patch for PostgreSQL/Supabase
-- BACK UP DATABASE FIRST. Run on a COPY of your existing DB before production.
-- This file does not drop existing tables, rows or columns.
BEGIN;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "payeeType" TEXT NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;

CREATE TABLE IF NOT EXISTS "CarDeposit" (
  "id" TEXT PRIMARY KEY,
  "carId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "agreedPrice" DECIMAL(15,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "note" TEXT,
  "collectorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarDeposit_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CarDeposit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SalesLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CarDeposit_carId_leadId_key" ON "CarDeposit"("carId","leadId");
CREATE INDEX IF NOT EXISTS "CarDeposit_carId_status_idx" ON "CarDeposit"("carId","status");

CREATE TABLE IF NOT EXISTS "CarDepositPayment" (
  "id" TEXT PRIMARY KEY,
  "depositId" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "kind" TEXT NOT NULL,
  "note" TEXT,
  "collectorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarDepositPayment_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "CarDeposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CarDepositPayment_depositId_createdAt_idx" ON "CarDepositPayment"("depositId","createdAt");

CREATE TABLE IF NOT EXISTS "CarDepositRefund" (
  "id" TEXT PRIMARY KEY,
  "depositId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "returnedAmount" DECIMAL(15,2) NOT NULL,
  "penaltyAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarDepositRefund_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "CarDeposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CarDepositRefund_depositId_createdAt_idx" ON "CarDepositRefund"("depositId","createdAt");

CREATE TABLE IF NOT EXISTS "SaleCommission" (
  "id" TEXT PRIMARY KEY,
  "carId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaleCommission_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SaleCommission_carId_createdAt_idx" ON "SaleCommission"("carId","createdAt");
COMMIT;
