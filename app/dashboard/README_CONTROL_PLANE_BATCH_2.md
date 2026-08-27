# Control Plane Batch 2

## Wiring order

1. Assignments
2. Staff → Matter assignment
3. Case management
4. Quote / pre-quote management
5. Assignment permission scopes
6. Live RLS verification
7. Button/navigation smoke test

## Rules

- Super Admin is the administrative source of truth.
- Staff access is enforced by Supabase RLS, not by hidden UI controls.
- Permission keys and scopes must match the live database schema.
- Matter, case, quote and assignment identifiers must be passed as UUIDs.
- No placeholder success state may be shown unless the underlying write succeeds.
- Client Portal and Company Admin Login remain outside this control-plane batch.
