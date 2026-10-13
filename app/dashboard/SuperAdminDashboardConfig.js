/**
 * Super Admin sidebar: ordered operational workspace map.
 * Keep routes on existing production pages and in-page controls where possible.
 */
export const SUPER_ADMIN_DASHBOARD_CATEGORIES = Object.freeze([
 {key:"core",title:"Core & Service Access",description:"The systems you use most.",modules:[
  {title:"HR Payroll",href:"../client/payroll-login.html",description:"Payroll import, reconciliation, calculation and release approvals."},
  {title:"SARS Compliance",href:"../client/dashboard.html#sars-compliance",description:"SARS compliance workspace and monthly retainer access."},
  {title:"Services & Pricing",href:"#admin-commercial-config",description:"Catalogue, prices, billing models and customer assignment."},
  {title:"Secrets & Integrations",href:"#admin-secrets-config",description:"Encrypted credentials and integration health."},
  {title:"Operational",href:"./matters.html",description:"Matters, assignments, work queue and appointments."},
  {title:"Client Service Approval",href:"#commercial-approval-center",description:"Approve portal access, assign modules and release after verified payment."}
 ]},
 {key:"services",title:"Main Services",description:"The four customer-facing service lines and their catalogue subcategories.",modules:[
  {title:"Immigration",href:"#service-immigration",description:"Visas, permits, renewals, permanent residence, appeals and refusals."},
  {title:"HR / IR",href:"#service-hr-ir",description:"Payroll, SARS, contracts, policies, hearings, CCMA and HR support."},
  {title:"Legal",href:"#service-legal",description:"Consultations, legal drafting, document review, agreements and advice."},
  {title:"Business Compliance",href:"#service-business-compliance",description:"Company setup, SARS, UIF, COIDA, tax clearance and compliance."}
 ]},
 {key:"communications",title:"Anthony & Communications",description:"Auditable AI and client communications.",modules:[
  {title:"Anthony Activity Logs",href:"./ai.html",description:"AI activity, oversight and intervention controls."},
  {title:"Anthony WhatsApp Logs",href:"./communications.html",description:"Inbound/outbound message history and delivery state."},
  {title:"Company Documents",href:"./document-vault.html",description:"Controlled company and client document repository."}
 ]},
 {key:"finance",title:"Finance",description:"Commercial operations and payment oversight.",modules:[
  {title:"Finance Overview",href:"./invoices.html",description:"Invoices, payment status, balances and billing."},
  {title:"Quotes & Estimates",href:"./quotes.html",description:"Quote preparation and approval."},
  {title:"Payroll Approval",href:"#payroll-approval-list",description:"Review internal payroll before release."}
 ]},
 {key:"management",title:"People & Administration",description:"Accounts, permissions and firm operations.",modules:[
  {title:"Client Accounts",href:"./accounts.html",description:"Customer identity, company relationships and portal status."},
  {title:"Staff & Permissions",href:"./staff-admin.html",description:"Staff access and role controls."},
  {title:"Company Profile",href:"./organisation-profile.html",description:"Legal identity, tax and firm configuration."},
  {title:"Reports & Analytics",href:"./reports.html",description:"Operational and financial reporting."},
  {title:"Dashboard Home",href:"./super-admin.html",description:"Return to the Super Admin overview."}
 ]}
]);
export function getSuperAdminCategories(){return SUPER_ADMIN_DASHBOARD_CATEGORIES.map(c=>({...c,modules:c.modules.map(m=>({...m}))}));}
export default SUPER_ADMIN_DASHBOARD_CATEGORIES;
