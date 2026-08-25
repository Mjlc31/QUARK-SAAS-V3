-- Migration: 20260825_refresh_financial_view.sql

-- Function to refresh the financial summary materialized view
CREATE OR REPLACE FUNCTION refresh_mv_monthly_financial_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- We use CONCURRENTLY to avoid locking the view for reads.
  -- This is possible because there is a unique index on (user_id, month, category, type).
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_financial_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists to ensure idempotency
DROP TRIGGER IF EXISTS trigger_refresh_mv_monthly_financial_summary ON financial_transactions;

-- Create the trigger on financial_transactions table
-- FOR EACH STATEMENT is used to prevent multiple refreshes in case of bulk operations
CREATE TRIGGER trigger_refresh_mv_monthly_financial_summary
AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_mv_monthly_financial_summary();
