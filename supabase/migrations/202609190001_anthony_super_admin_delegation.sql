-- Anthony Isaacs delegation policy: every active SUPER_ADMIN receives the complete
-- Anthony administrative capability set. Anthony remains a delegated assistant;
-- he never receives an independent authority identity.
update public.authority_directory
set action_permissions = jsonb_build_object(
  'can_liaise_with_ai', true,
  'can_answer_ai_queries', true,
  'can_relay_to_clients', true,
  'can_handle_appointments', true,
  'can_provide_pricing', true,
  'can_approve_quotes', true,
  'can_handle_immigration', true,
  'can_handle_hr', true,
  'can_handle_business_compliance', true,
  'can_handle_legal', true,
  'manage_authority', true,
  'manage_staff', true,
  'manage_system', true
),
updated_at = now()
where is_active = true
  and upper(authority_role) = 'SUPER_ADMIN';
