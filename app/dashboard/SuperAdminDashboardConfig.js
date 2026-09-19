/**
 * Super Admin command-centre navigation.
 *
 * Existing routes are preserved. This file is only a navigation/control map;
 * operational data remains in the existing dashboard services and Supabase.
 */
export const SUPER_ADMIN_DASHBOARD_CATEGORIES = Object.freeze([
  { key:"command-centre", title:"Command Centre", description:"Live workload, alerts and operational health.", modules:[
    {title:"Dashboard",href:"./super-admin.html",description:"Live firm overview and control centre."},
    {title:"Reports",href:"./reports.html",description:"Operational, financial and document reporting."},
    {title:"Analytics",href:"./analytics.html",description:"Business intelligence and performance."}
  ]},
  { key:"people-authority", title:"People & Authority", description:"Authoritative identity, roles, staff and customer accounts.", modules:[
    {title:"Authority & People",href:"./authority-people.html",description:"Super Admins, Directors, Shareholders, Partners, Stakeholders and Staff."},
    {title:"Staff & Permissions",href:"./staff-admin.html",description:"Staff accounts, permissions and workload controls."},
    {title:"Individuals & Businesses",href:"./accounts.html",description:"Authoritative customer account records."},
    {title:"Clients",href:"./clients.html",description:"Client relationship and account management."}
  ]},
  { key:"operations", title:"Operations", description:"The firm's live work queue.", modules:[
    {title:"Matters",href:"./matters.html",description:"Open and progress firm matters."},
    {title:"Assignments",href:"./assignments.html",description:"Allocate operational work."},
    {title:"Cases",href:"./cases.html",description:"Manage case records linked to matters."},
    {title:"Document Vault",href:"./document-vault.html",description:"Review controlled documents and ingestion state."}
  ]},
  { key:"communications", title:"Communications", description:"Controlled WhatsApp and notification operations.", modules:[
    {title:"WhatsApp Communications",href:"./communications.html",description:"Read and send controlled WhatsApp messages."},
    {title:"Response SLA",href:"./communications.html",description:"Review the WhatsApp response obligation from the command centre."}
  ]},
  { key:"finance", title:"Finance", description:"Existing commercial ledger and service-rate controls.", modules:[
    {title:"Quotes",href:"./quotes.html",description:"Create, review and track quotations."},
    {title:"Invoices",href:"./invoices.html",description:"Create, send and audit invoices."},
    {title:"Service Inventory & Rates",href:"./service-inventory.html",description:"Authoritative services and rates."}
  ]},
  { key:"documents", title:"Documents", description:"Controlled document and organisation records.", modules:[
    {title:"Document Workspace",href:"./document-workspace.html",description:"Controlled document operations."},
    {title:"Document Vault",href:"./document-vault.html",description:"Client document review and ingestion."},
    {title:"Organisation Master",href:"./organisation-profile.html",description:"Legal identity, tax, banking and firm configuration."}
  ]},
  { key:"anthony", title:"Anthony Isaacs", description:"Oversight of the existing AI control plane without changing runtime architecture.", modules:[
    {title:"AI Control & Knowledge",href:"./ai.html",description:"Governed AI orchestration and knowledge controls."},
    {title:"WhatsApp Communications",href:"./communications.html",description:"Operational communication surface."},
    {title:"Authority & People",href:"./authority-people.html",description:"Authority records used by Anthony."}
  ]}
]);

export function getSuperAdminCategories(){
  return SUPER_ADMIN_DASHBOARD_CATEGORIES.map(category=>({
    ...category,
    modules:category.modules.map(module=>({...module}))
  }));
}
export default SUPER_ADMIN_DASHBOARD_CATEGORIES;