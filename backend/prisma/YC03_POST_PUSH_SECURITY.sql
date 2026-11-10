-- Garage OS YC03: run on a dedicated/staging Supabase project AFTER Prisma db push.
-- The web app uses its authenticated Node/Prisma API; it does NOT use Supabase
-- anon/authenticated data access to Garage OS's business tables.
-- NEVER run blindly on a shared project that has other apps relying on these grants.
-- This does not delete data, authentication accounts, Storage, or API keys.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Car','CarInspectionAssignment','InspectionBlock','InspectionPhoto',
    'InspectionComment','MaintenanceRecord','MaintenanceInvoice','SalesLead',
    'LeadActivity','CarDeal','SalePayment','Expense','WarrantyRecord',
    'AuditLog','DepositSettlement','CarDeposit','CarDepositPayment',
    'CarDepositRefund','SaleCommission','VehicleDocument'
  ] LOOP
    IF to_regclass(format('public.%I',t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',t);
    END IF;
  END LOOP;
END $$;
