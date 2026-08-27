# Next verified implementation batch

The navigation foundation is committed. The next code batch should wire the existing live pages to Supabase in this order:

- Assignment Data Service + Controller
- Staff-to-Matter assignment UI and persistence
- Case CRUD + access enforcement
- Quote/pre-quote CRUD + approval workflow
- Permission scope editor for assignments
- End-to-end RLS tests for Super Admin and Staff

Do not introduce a second authentication or permission abstraction. Reuse AuthService, the existing Supabase configuration, live permission functions and RLS policies.
