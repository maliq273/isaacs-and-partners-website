# PR35 — Client / Business / Matter Foundation Test Plan

## Repository integrity
- [ ] PR35 branch is based on merged `main`.
- [ ] No duplicate authentication or Supabase configuration is introduced.
- [ ] No service-role, GitHub or OpenAI secret is present in frontend files.

## Database migration
Run:

```text
npx supabase migration list
npx supabase db push --dry-run
```

Expected pending migration:

```text
202609010001_client_business_matter_access.sql
```

Do not push until the dry-run identifies only the PR35 migration.

## RPC validation
After deployment, verify:

```sql
select routine_schema, routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'client_can_access_matter',
    'get_my_matters',
    'get_matter_access_context'
  )
order by routine_name;
```

Verify public execution is not granted and authenticated execution is granted:

```sql
select routine_schema, routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'client_can_access_matter',
    'get_my_matters',
    'get_matter_access_context'
  )
order by routine_name, grantee;
```

## Access tests
1. Super Admin can list matters.
2. An individual client can list only matters belonging to that user.
3. A business owner can list only matters belonging to that business.
4. An unrelated client cannot access another client's matter context.
5. An assigned staff member can access a matter only through existing staff permissions.
6. An unauthenticated caller cannot execute the authenticated RPCs.
7. Missing/nonexistent matter IDs fail safely.

## Application integration
- [ ] `ClientMatterAccessService` is instantiated with the repository's existing Supabase client.
- [ ] No service creates its own auth/session/configuration.
- [ ] Existing `ClientService`, `Matter` domain logic and repository abstractions remain intact.
- [ ] Existing organisation master persistence remains intact.
- [ ] Existing quote/invoice security remains intact.

## Production safety
- [ ] No client documents are committed to GitHub.
- [ ] Private document storage remains the next implementation boundary.
- [ ] AI retrieval is not enabled against confidential matter data until document/RLS boundaries are verified.
