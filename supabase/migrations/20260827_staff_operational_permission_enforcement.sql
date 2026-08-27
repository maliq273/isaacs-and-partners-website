-- Isaacs & Partners
-- Staff operational permission enforcement.
-- Super Admin remains unrestricted. Client/business ownership remains intact.
-- Staff access is additionally gated by the existing permission manager.

-- DOCUMENTS
DROP POLICY IF EXISTS documents_select_authorised ON public.documents;
CREATE POLICY documents_select_authorised
ON public.documents
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR individual_user_id = auth.uid()
    OR business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_user_id = auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.matters m
        WHERE m.id = documents.matter_id
          AND (
              m.individual_user_id = auth.uid()
              OR m.business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_user_id = auth.uid())
          )
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('view_documents')
        AND documents.matter_id IS NOT NULL
        AND public.staff_can_access_matter(documents.matter_id, 'view_documents')
    )
);

DROP POLICY IF EXISTS documents_admin_insert ON public.documents;
CREATE POLICY documents_admin_insert
ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_documents')
        AND documents.matter_id IS NOT NULL
        AND public.staff_can_access_matter(documents.matter_id, 'manage_documents')
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS documents_admin_update ON public.documents;
CREATE POLICY documents_admin_update
ON public.documents
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_documents')
        AND documents.matter_id IS NOT NULL
        AND public.staff_can_access_matter(documents.matter_id, 'manage_documents')
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_documents')
        AND documents.matter_id IS NOT NULL
        AND public.staff_can_access_matter(documents.matter_id, 'manage_documents')
    )
);

-- APPOINTMENTS
DROP POLICY IF EXISTS appointments_select_authorised ON public.appointments;
CREATE POLICY appointments_select_authorised
ON public.appointments
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR individual_user_id = auth.uid()
    OR business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_user_id = auth.uid())
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('view_matters')
        AND (
            (
                matter_id IS NOT NULL
                AND public.staff_can_access_matter(matter_id, 'view_matters')
            )
            OR assigned_staff_id IN (
                SELECT s.id FROM public.staff s
                WHERE s.user_id = auth.uid() AND s.is_active = true
            )
        )
    )
);

DROP POLICY IF EXISTS appointments_admin_insert ON public.appointments;
CREATE POLICY appointments_admin_insert
ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_assignments')
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS appointments_admin_update ON public.appointments;
CREATE POLICY appointments_admin_update
ON public.appointments
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_assignments')
        AND (
            created_by = auth.uid()
            OR assigned_staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
        )
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_assignments')
    )
);

-- TASKS: staff may see and operate their own assigned workload only when they
-- have the matter permission required to access the parent matter.
DROP POLICY IF EXISTS tasks_select_authorised ON public.tasks;
CREATE POLICY tasks_select_authorised
ON public.tasks
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR created_by = auth.uid()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('view_matters')
        AND assigned_staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
        AND (
            matter_id IS NULL
            OR public.staff_can_access_matter(matter_id, 'view_matters')
        )
    )
);

DROP POLICY IF EXISTS tasks_admin_insert ON public.tasks;
CREATE POLICY tasks_admin_insert
ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('assign_matters')
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS tasks_admin_update ON public.tasks;
CREATE POLICY tasks_admin_update
ON public.tasks
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR created_by = auth.uid()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('assign_matters')
        AND assigned_staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR created_by = auth.uid()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('assign_matters')
    )
);

-- INVOICES: financial visibility and mutation are separate permissions.
DROP POLICY IF EXISTS invoices_select_authorised ON public.invoices;
CREATE POLICY invoices_select_authorised
ON public.invoices
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR individual_user_id = auth.uid()
    OR business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_user_id = auth.uid())
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('view_financials')
        AND matter_id IS NOT NULL
        AND public.staff_can_access_matter(matter_id, 'view_financials')
    )
);

DROP POLICY IF EXISTS invoices_admin_insert ON public.invoices;
CREATE POLICY invoices_admin_insert
ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS invoices_admin_update ON public.invoices;
CREATE POLICY invoices_admin_update
ON public.invoices
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
        AND (
            created_by = auth.uid()
            OR (matter_id IS NOT NULL AND public.staff_can_access_matter(matter_id, 'manage_invoices'))
        )
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
    )
);

-- PAYMENTS: only financial operators or Super Admin may write; visibility follows
-- the invoice access boundary.
DROP POLICY IF EXISTS payments_select_authorised ON public.payments;
CREATE POLICY payments_select_authorised
ON public.payments
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR received_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = payments.invoice_id
          AND (
              i.individual_user_id = auth.uid()
              OR i.business_id IN (SELECT b.id FROM public.businesses b WHERE b.owner_user_id = auth.uid())
              OR (
                  public.current_user_role() = 'STAFF'::app_role
                  AND public.has_staff_permission('view_financials')
                  AND i.matter_id IS NOT NULL
                  AND public.staff_can_access_matter(i.matter_id, 'view_financials')
              )
          )
    )
);

DROP POLICY IF EXISTS payments_admin_insert ON public.payments;
CREATE POLICY payments_admin_insert
ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND received_by = auth.uid()
    )
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
        AND received_by = auth.uid()
    )
);

DROP POLICY IF EXISTS payments_admin_update ON public.payments;
CREATE POLICY payments_admin_update
ON public.payments
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR received_by = auth.uid()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
        AND EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = payments.invoice_id
              AND i.matter_id IS NOT NULL
              AND public.staff_can_access_matter(i.matter_id, 'manage_invoices')
        )
    )
)
WITH CHECK (
    public.is_super_admin()
    OR received_by = auth.uid()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('manage_invoices')
    )
);

COMMENT ON TABLE public.documents IS 'Authoritative document register with role and staff permission enforcement.';
COMMENT ON TABLE public.appointments IS 'Authoritative appointment register with role and staff permission enforcement.';
COMMENT ON TABLE public.tasks IS 'Authoritative task register with role and staff permission enforcement.';
COMMENT ON TABLE public.invoices IS 'Authoritative invoice ledger with financial permission enforcement.';
COMMENT ON TABLE public.payments IS 'Authoritative payment ledger with financial permission enforcement.';
