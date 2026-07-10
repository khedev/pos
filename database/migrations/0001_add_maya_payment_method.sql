-- Migration: Add 'maya' to the sales.payment_method CHECK constraint
-- The POS frontend allows a "maya" payment method, but the original
-- schema CHECK only permitted ('cash', 'card', 'gcash'). This caused
-- "complete sale" / checkout to fail with a constraint violation.

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'gcash', 'maya'));