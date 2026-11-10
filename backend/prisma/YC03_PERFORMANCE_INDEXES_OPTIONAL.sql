-- Optional indexes for larger vehicle/expense catalogs; test on staging.
-- Uses pg_trgm for case-insensitive substring searches (ILIKE / contains).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS yc03_car_plate_search_idx ON public."Car" USING gin ("plate" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc03_car_brand_search_idx ON public."Car" USING gin ("brand" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc03_car_model_search_idx ON public."Car" USING gin ("model" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc03_lead_name_search_idx ON public."SalesLead" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc03_vehicle_document_customer_search_idx ON public."VehicleDocument" USING gin ("customerName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS yc03_expense_date_employee_idx ON public."Expense" ("date", "assignedToId");
CREATE INDEX IF NOT EXISTS yc03_expense_date_payee_idx ON public."Expense" ("date", "payeeType");
