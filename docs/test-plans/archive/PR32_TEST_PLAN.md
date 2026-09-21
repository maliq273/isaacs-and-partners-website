# PR32 Test Plan — Company / Organisation Profile

## Purpose
Verify that the Company / Organisation Profile is written to Supabase and survives reloads, sessions and subsequent visits.

## Database
1. Run `npx supabase migration list`.
2. Run `npx supabase db push --dry-run`.
3. Run `npx supabase db push` if the PR32 migration is pending.
4. Confirm the migration is Local = Remote.

## Browser
1. Hard refresh the website.
2. Sign in with the existing Super Admin account.
3. Open Super Admin → Company / Organisation Profile.
4. Enter the organisation's legal, contact, tax and document-engine information.
5. Click `Save Master Record`.
6. Confirm the success message.
7. Reload the page with `Ctrl + Shift + R`.
8. Confirm all saved fields remain populated.
9. Sign out.
10. Sign back in with the Super Admin account.
11. Return to Company / Organisation Profile.
12. Confirm all fields remain populated.

## Database verification
Run:

```sql
select id, legal_name, trading_name, email, registration_number,
       vat_number, is_active, created_at, updated_at
from public.organisation_profiles
order by updated_at desc nulls last, created_at desc nulls last;
```

Expected: exactly one active master record containing the saved organisation information.

## Security checks
- The organisation email must never become an authentication login automatically.
- Only Super Admin may create/update the master record.
- No GitHub token or secret is stored in the browser profile record.
- Existing organisation document routing remains unchanged.
