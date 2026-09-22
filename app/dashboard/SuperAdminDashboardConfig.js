/**
 * Super Admin command-centre navigation.
 *
 * One authoritative navigation map. Routes are existing production routes;
 * this file only controls presentation/order and does not create a second data model.
 */
export const SUPER_ADMIN_DASHBOARD_CATEGORIES = Object.freeze([
  { key:"command-centre", title:"Command Centre", description:"Live workload, alerts and operational health.", modules:[
    {title:"Dashboard",href:"./super-admin.html",description:"Live firm overview and control centre."},
    {title:"Reports",href:"./reports.html",description:"Operational, financial and document reporting."},
    {title:"Analytics",href:"./analytics.html",description:"Business intelligence and performance."}
  ]},
  { key:"people", title:"People & Accounts", description:"Authoritative people, staff and client records.", modules:[
    {title:"Authority & People",href:"./authority-people.html",description:"Super Admins, Directors, Shareholders, Partners and Staff."},
    {title:"Staff & Permissions",href:"./staff-admin.html",description:"Staff accounts, permissions and workload controls."},
    {title:"Individuals & Businesses",href:"./accounts.html",description:"Authoritative customer account records."},
    {title:"Clients",href:"./clients.html",description:"Client relationship and account management."}
  ]},
  { key:"operations", title:"Operations", description:"The firm's live work queue.", modules:[
    {title:"Matters",href:"./matters.html",description:"Open and progress firm matters."},
    {title:"Assignments",href:"./assignments.html",description:"Allocate operational work."},
    {title:"Cases",href:"./cases.html",description:"Manage case records linked to matters."},
    {title:"Document Vault",href:"./document-vault.html",description:"Review controlled documents and ingestion state."},
    {title:"Document Workspace",href:"./document-workspace.html",description:"Controlled document operations."}
  ]},
  { key:"communications", title:"Communications", description:"Controlled WhatsApp and notification operations.", modules:[
    {title:"WhatsApp Communications",href:"./communications.html",description:"Read and send controlled WhatsApp messages."}
  ]},
  { key:"commercial", title:"Commercial & Finance", description:"Quotes, invoices, services and authoritative pricing.", modules:[
    {title:"Quotes",href:"./quotes.html",description:"Create, review and track quotations."},
    {title:"Invoices",href:"./invoices.html",description:"Create, send and audit invoices."},
    {title:"Service Inventory & Rates",href:"./service-inventory.html",description:"Authoritative services and editable rates."}
  ]},
  { key:"organisation", title:"Organisation", description:"The firm's legal and operational master record.", modules:[
    {title:"Organisation Master",href:"./organisation-profile.html",description:"Legal identity, tax, banking and firm configuration."}
  ]},
  { key:"anthony", title:"Anthony Isaacs", description:"Governed AI oversight and operational intelligence.", modules:[
    {title:"AI Control & Knowledge",href:"./ai.html",description:"AI orchestration, knowledge and intervention controls."}
  ]}
]);

export function getSuperAdminCategories(){
  return SUPER_ADMIN_DASHBOARD_CATEGORIES.map(category=>({
    ...category,
    modules:category.modules.map(module=>({...module}))
  }));
}
export default SUPER_ADMIN_DASHBOARD_CATEGORIES;
