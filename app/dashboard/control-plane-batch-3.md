# Control Plane Batch 3

This batch hardens the live Super Admin / Staff data flow without introducing a second data layer.

## Included

- Matter creation now enforces the live database rule that exactly one individual or business client must be attached.
- Matter creation calls `validate_matter_creation` before POST so users receive the actual business rule instead of a generic PostgREST 400.
- Matter creation continues to omit UI status values so the database owns the initial status default.
- Quote create and quote edit permissions are now evaluated independently.
- A shared control-plane runtime helper is available for subsequent dashboard wiring and consistent Super Admin return navigation.

## Verification target

1. Super Admin creates an individual/business.
2. Super Admin creates a matter linked to exactly one client.
3. Matter appears immediately in the live matters list.
4. Assignment sees active staff and assignable matters.
5. Cases can select visible matters.
6. Quote create/edit/approve buttons follow the permission manager.
7. Supabase RLS remains the final enforcement boundary.
