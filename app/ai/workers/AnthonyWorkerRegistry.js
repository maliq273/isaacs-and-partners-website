/**
 * Anthony Isaacs — specialist worker registry.
 * Workers are bounded specialists; Anthony remains the coordinating executive agent.
 * No worker receives unrestricted credentials or authority.
 */
export const ANTHONY_WORKERS = Object.freeze([
  { id:"RECEPTION", name:"Reception & Client Liaison", domains:["GENERAL","IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["identity","qualification","routing","communication"] },
  { id:"MATTER_OPERATIONS", name:"Matter Operations Worker", domains:["IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["matter_status","next_step","assignment","workflow"] },
  { id:"DOCUMENT_COMPLIANCE", name:"Document & Evidence Worker", domains:["IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["document_checklist","evidence_gap","release_gate","provenance"] },
  { id:"COMMERCIAL", name:"Commercial & Billing Worker", domains:["IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["estimate","quote_state","invoice_state","payment_gate"] },
  { id:"COMMUNICATIONS", name:"Communications Worker", domains:["GENERAL","IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["portal","whatsapp","notifications","handover"] },
  { id:"COMPLIANCE", name:"SA Compliance Worker", domains:["IMMIGRATION","HR","BUSINESS"], capabilities:["sars","payroll","uif","coida","cipc","statutory"] },
  { id:"MEMORY", name:"Relationship & Hindsight Worker", domains:["GENERAL","IMMIGRATION","HR","BUSINESS","LEGAL"], capabilities:["history","relationship_memory","learned_context","continuity"] },
  { id:"SYSTEM_GUARDIAN", name:"System Guardian & QA Worker", domains:["SYSTEM"], capabilities:["diagnostics","dependency_map","regression_risk","change_plan","release_gate"] }
]);

export function getWorker(id){ return ANTHONY_WORKERS.find(w=>w.id===id)||null; }
export function workersFor({domain="GENERAL",capability}={}){
  const d=String(domain||"GENERAL").toUpperCase();
  return ANTHONY_WORKERS.filter(w=>(w.domains||[]).includes(d)||(w.domains||[]).includes("GENERAL"))
    .filter(w=>!capability||(w.capabilities||[]).includes(capability));
}
