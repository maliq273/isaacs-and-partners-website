-- Restore the intended WhatsApp qualification state model for existing
-- temporary registrations. No authority is granted by a claim; verified
-- WhatsApp authority remains determined by authority_directory.

update public.communication_contacts c
set onboarding_state='STAFF_PENDING_APPROVAL',
    dashboard_status='PENDING_ADMIN_APPROVAL',
    account_match_status='STAFF_NO_MATCH',
    updated_at=now()
where c.claimed_account_type='STAFF'
  and c.identity_status='UNAUTHENTICATED_WHATSAPP_CONTACT'
  and c.onboarding_state='CLIENT_PENDING_APPROVAL';

-- A number already present in the active authority directory is not a
-- pending registration. The authority directory remains authoritative.
update public.communication_contacts c
set onboarding_state='AUTHENTICATED_STAFF',
    dashboard_status='ACTIVE',
    account_match_status='MATCHED_AUTHORITY',
    claimed_account_type=null,
    updated_at=now()
where c.phone_number in (
    select ad.phone_number
    from public.authority_directory ad
    where ad.is_active=true
);
