-- YC04: execute in Supabase SQL Editor on staging first; additive only.
-- Indexes speed status/date ordering and selective search; monitor query plans.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS yc04_car_status_created_idx ON public."Car" ("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_car_created_idx ON public."Car" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_car_updated_idx ON public."Car" ("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_car_inspection_due_idx ON public."Car" ("inspectionDueAt");
CREATE INDEX IF NOT EXISTS yc04_car_plate_trgm_idx ON public."Car" USING gin ("plate" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_car_brand_trgm_idx ON public."Car" USING gin ("brand" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_car_model_trgm_idx ON public."Car" USING gin ("model" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_lead_name_trgm_idx ON public."SalesLead" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_lead_phone_trgm_idx ON public."SalesLead" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_lead_car_created_idx ON public."SalesLead" ("carId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_deal_sold_idx ON public."CarDeal" ("soldAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_payment_received_idx ON public."SalePayment" ("receivedAt" DESC);
CREATE INDEX IF NOT EXISTS yc04_expense_date_employee_idx ON public."Expense" ("date" DESC,"assignedToId");
CREATE INDEX IF NOT EXISTS yc04_expense_employee_date_idx ON public."Expense" ("assignedToId","date" DESC);
CREATE INDEX IF NOT EXISTS yc04_expense_payee_date_idx ON public."Expense" ("payeeType","date" DESC);
CREATE INDEX IF NOT EXISTS yc04_expense_group_date_idx ON public."Expense" ("category","date" DESC);
CREATE INDEX IF NOT EXISTS yc04_doc_customer_trgm_idx ON public."VehicleDocument" USING gin ("customerName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc04_doc_status_updated_idx ON public."VehicleDocument" ("status","updatedAt" DESC);
-- Only create necessary indexes: each index adds write overhead.
