-- Optional Supabase Realtime publication setup. Use after creating the YC03 tables.
-- SUBSCRIBER AUTHENTICATION: Node backend uses private service-role only.
-- Do not expose service-role credentials in frontend or grant public data access.
DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'Car','CarDeal','CarDeposit','CarDepositPayment','CarDepositRefund',
    'MaintenanceRecord','InspectionBlock','InspectionComment','InspectionPhoto',
    'SalesLead','SaleCommission','VehicleDocument','Expense','WarrantyRecord','User'
  ] LOOP
    IF to_regclass(format('public.%I',t)) IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t)
    THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
    END IF;
  END LOOP;
END $$;
