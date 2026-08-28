-- Staff client visibility is controlled by the existing permission manager.
-- Super Admin remains unrestricted; individual users retain ownership access.

DROP POLICY IF EXISTS profiles_staff_view_clients ON public.profiles;
CREATE POLICY profiles_staff_view_clients
ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND role = 'INDIVIDUAL'::app_role
        AND public.has_staff_permission('view_clients')
    )
);

DROP POLICY IF EXISTS businesses_select_owner_or_admin ON public.businesses;
CREATE POLICY businesses_select_owner_or_admin
ON public.businesses
FOR SELECT TO authenticated
USING (
    owner_user_id = auth.uid()
    OR public.is_super_admin()
    OR (
        public.current_user_role() = 'STAFF'::app_role
        AND public.has_staff_permission('view_clients')
    )
);

COMMENT ON POLICY profiles_staff_view_clients ON public.profiles IS
'Allows active staff with view_clients permission to view individual client profiles; Super Admin remains unrestricted.';

COMMENT ON POLICY businesses_select_owner_or_admin ON public.businesses IS
'Allows active staff with view_clients permission to view business client records; owners and Super Admin retain access.';
