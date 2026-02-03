-- Update RLS policies for data tables to support employee visibility

-- WEEKLY RECORDS: Drop existing policies and create new ones
DROP POLICY IF EXISTS "Admins can view weekly records" ON public.weekly_records;
DROP POLICY IF EXISTS "Admins can insert weekly records" ON public.weekly_records;
DROP POLICY IF EXISTS "Admins can update weekly records" ON public.weekly_records;
DROP POLICY IF EXISTS "Admins can delete weekly records" ON public.weekly_records;

CREATE POLICY "Users can view own or admin all weekly records"
ON public.weekly_records FOR SELECT
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can insert weekly records"
ON public.weekly_records FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own or admin all weekly records"
ON public.weekly_records FOR UPDATE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can delete own or admin all weekly records"
ON public.weekly_records FOR DELETE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- DAILY TRANSACTIONS: Drop existing and create new policies
DROP POLICY IF EXISTS "Admins can view daily transactions" ON public.daily_transactions;
DROP POLICY IF EXISTS "Admins can insert daily transactions" ON public.daily_transactions;
DROP POLICY IF EXISTS "Admins can update daily transactions" ON public.daily_transactions;
DROP POLICY IF EXISTS "Admins can delete daily transactions" ON public.daily_transactions;

CREATE POLICY "Users can view own or admin all daily transactions"
ON public.daily_transactions FOR SELECT
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can insert daily transactions"
ON public.daily_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own or admin all daily transactions"
ON public.daily_transactions FOR UPDATE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can delete own or admin all daily transactions"
ON public.daily_transactions FOR DELETE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- INVOICES: Drop existing and create new policies
DROP POLICY IF EXISTS "Admins can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;

CREATE POLICY "Users can view own or admin all invoices"
ON public.invoices FOR SELECT
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own or admin all invoices"
ON public.invoices FOR UPDATE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can delete own or admin all invoices"
ON public.invoices FOR DELETE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- INVOICE LINE ITEMS: Drop existing and create new policies
DROP POLICY IF EXISTS "Admins can view invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins can insert invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins can delete invoice line items" ON public.invoice_line_items;

CREATE POLICY "Users can view own or admin all invoice line items"
ON public.invoice_line_items FOR SELECT
USING (
  public.is_admin(auth.uid()) 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert invoice line items"
ON public.invoice_line_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own or admin all invoice line items"
ON public.invoice_line_items FOR DELETE
USING (
  public.is_admin(auth.uid()) 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.created_by = auth.uid()
  )
);