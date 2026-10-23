/**
 * Super Admin sidebar: ordered operational workspace map.
 * Keep routes on existing production pages and in-page controls where possible.
 */
export const SUPER_ADMIN_DASHBOARD_CATEGORIES = Object.freeze([
 {key:"core",title:"Core & Service Access",description:"The systems you use most.",modules:[
  {title:"HR Payroll",href:"./payroll-sars-workspace.html#payroll-centre",description:"Super Admin payroll import, reconciliation, calculation and release approvals."},
  {title:"SARS Compliance",href:"./payroll-sars-workspace.html#sars-compliance",description:"Super Admin SARS compliance workspace and monthly retainer access."},
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
  {title:"Anthony Memory & Grok",href:"./anthony-memory.html",description:"Curated durable memory, audit trail and optional privacy-controlled Grok agent."},
  {title:"Anthony WhatsApp Logs",href:"./communications.html",description:"Inbound/outbound message history and delivery state."},
  {title:"Company Documents",href:"./document-vault.html",description:"Controlled company and client document repository."}
 ]},
 {key:"billing",title:"Billing & Accounts",description:"Service rates, customer balances, and vendor liabilities.",modules:[
  {title:"Services & Pricing",href:"#admin-commercial-config",description:"Create and price billable services; save canonical rates used by invoices."},
  {title:"Customer Invoices",href:"./invoices.html",description:"Accounts receivable, verified payments and invoice status."},
  {title:"Customer Statements",href:"./customer-statements.html",description:"Generate account statements from issued invoices and completed payments."},
  {title:"Quotes & Estimates",href:"./quotes.html",description:"Prepare and approve quotes from the service catalogue."},
  {title:"Vendor Payables",href:"./vendor-payables.html",description:"Capture supplier invoices, amounts owed by Isaacs & Partners and vendor statements."},
  {title:"Internal Payroll Approval",href:"#payroll-approval-list",description:"Review internal payroll before release."}
 ]},
 {key:"calendar",title:"Scheduling",description:"Appointments and customer-facing availability.",modules:[
  {title:"Calendar & Availability Admin",href:"./calendar-control.html",description:"Publish appointment slots, review customer requests and schedule hearings/site visits."},
  {title:"Public Booking Page",href:"../booking/index.html",description:"Customer-facing booking page with published availability."},
  {title:"Operational Calendar",href:"./matters.html",description:"Coordinate hearings, site visits, matter assignments and appointments through operational records."}
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
