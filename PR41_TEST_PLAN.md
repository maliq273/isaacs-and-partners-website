# PR41 — Super Admin Dashboard Refactor Test Plan

## Scope
Refactor the existing Super Admin dashboard into the requested operating categories without replacing the existing dashboard modules or data services.

## Categories
- Marketing
- Operations
- Intelligence
- Deals
- Customers
- Sales
- Back Office
- AI Workload

## Functional checks
1. Sign in as SUPER_ADMIN and open `app/dashboard/super-admin.html`.
2. Confirm role protection still redirects non-admin users to their authorised dashboard.
3. Confirm the dashboard renders all eight categories.
4. Confirm every category link points to an existing dashboard route.
5. Confirm Operations exposes Matters, Assignments, Cases and Document Vault.
6. Confirm Deals exposes Quotes and Invoices.
7. Confirm Customers exposes Individuals & Businesses.
8. Confirm Sales exposes Quotes and Service Inventory & Rates.
9. Confirm Back Office exposes Organisation Master, Staff & Permissions and Reports.
10. Confirm AI Workload exposes AI Control & Knowledge and Document Vault.

## Live-data checks
1. Staff count comes from `AdminDashboardDataService`.
2. Open and unassigned matter counts come from live matters/assignments data.
3. Integration/provider health remains sourced from the existing control-plane registry.
4. Integration events remain visible and status-labelled.
5. Worker Control Board must not claim a worker is connected unless the underlying provider/control-plane state supports that claim.
6. No credentials are placed in HTML, JavaScript, localStorage or sessionStorage.

## Regression checks
- Existing organisation, service inventory, staff, accounts, matters, assignments, cases, reports, analytics, AI, quotes, invoices and document-vault pages remain unchanged.
- Existing `DashboardPageController` authentication and role enforcement remain intact.
- Existing GitHub integration form remains available to SUPER_ADMIN only.
