-- Staff create permissions for core operational records.
-- Super Admin remains unrestricted. Staff must identify themselves as creator.

DROP POLICY IF EXISTS matters_admin_insert ON public.matters;
CREATE POLICY matters_admin_insert
ON public.matters
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('create_matters')
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS cases_admin_insert ON public.cases;
CREATE POLICY cases_admin_insert
ON public.cases
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('create_cases')
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS quotes_insert_authenticated ON public.quotes;
CREATE POLICY quotes_insert_authenticated
ON public.quotes
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('create_quotes')
        AND created_by = auth.uid()
    )
    OR (
        public.current_user_role() <> 'STAFF'::app_role
        AND created_by = auth.uid()
    )
);

COMMENT ON POLICY matters_admin_insert ON public.matters IS
'Super Admin or authenticated creator with create_matters permission when role is STAFF.';
COMMENT ON POLICY cases_admin_insert ON public.cases IS
'Super Admin or authenticated creator with create_cases permission when role is STAFF.';
COMMENT ON POLICY quotes_insert_authenticated ON public.quotes IS
'Super Admin or authenticated creator with create_quotes permission when role is STAFF.';
