# PR34 — Foundation Security & Application Integration Test Plan

## Scope

PR34 establishes the reusable client-side application security boundary while preserving the existing AuthService, AuthGuard, DashboardAccess and Supabase authorization architecture.

## Security model

The browser may determine whether navigation should be allowed for UX purposes, but it is never the authoritative authorization layer.

Authoritative controls remain:

1. Supabase Auth session.
2. PostgreSQL Row Level Security.
3. Existing database authorization helpers/policies.
4. Authenticated Supabase Edge Functions for privileged operations.
5. Server-side secrets only.

## Role routing contract

| Role | Dashboard |
|---|---|
| SUPER_ADMIN | `/app/dashboard/super-admin.html` |
| STAFF | `/app/dashboard/staff.html` |
| BUSINESS | `/app/dashboard/business.html` |
| INDIVIDUAL | `/app/dashboard/individual.html` |

## Browser tests

- Unauthenticated access to protected pages redirects to login.
- Authenticated SUPER_ADMIN resolves from `public.profiles` and reaches Super Admin.
- Authenticated STAFF resolves from `public.profiles` and reaches Staff.
- Authenticated BUSINESS resolves from `public.profiles` and reaches Business.
- Authenticated INDIVIDUAL resolves from `public.profiles` and reaches Individual.
- A user cannot use a dashboard URL to elevate their role.
- Failed profile-role resolution does not silently default to INDIVIDUAL.
- Return URLs remain same-origin and cannot create an open redirect.

## Data/security tests

- Frontend contains no Supabase service-role key.
- Frontend contains no OpenAI secret key.
- Frontend contains no GitHub token.
- Privileged operations remain Edge Function/server-side operations.
- Existing organisation master persistence continues to work.
- Existing canonical brand asset pipeline continues to work.
- RLS remains enabled on confidential tables.

## Next PR dependencies

PR34 is deliberately limited to the application security boundary. Subsequent PRs can safely build the client/business/matter/document/AI layers on top of it without creating a second authentication or authorization abstraction.
