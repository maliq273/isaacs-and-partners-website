# Control Plane Navigation Contract

All Super Admin and Staff control-plane pages use the same navigation contract.

- `data-return-super-admin` sends the user to `/app/dashboard/super-admin.html`.
- Control-plane pages must use `control-plane-nav.css` for shared navigation/action styling.
- Authentication is checked before protected control-plane actions.
- Client Portal and Company Admin Login are not part of the Super Admin/Staff control plane.
- Individual and Business client dashboards remain a separate implementation surface.

This file is intentionally documentation-only; page-specific controllers remain responsible for their own data operations.
