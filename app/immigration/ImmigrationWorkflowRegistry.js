/**
 * Immigration workflow catalog.
 * Anthony selects the workflow first, then loads the intake/evidence/form intelligence.
 * Learned memory and model reasoning never override live matter truth, permissions,
 * legal sources, or human approval.
 */
import { getImmigrationFormIntelligence, listImmigrationFormIntelligence } from "./ImmigrationFormIntelligenceRegistry.js";

export const IMMIGRATION_WORKFLOWS=Object.freeze({
 "DHA-84":{code:"DHA-84",kind:"FORM",name:"Port of Entry / Transit Visa",template:"immigrations_docs/Visitor-Visa-Application-Form-DHA-84-Form-11-June-19-2014.pdf",intelligence:"DHA-84",status:"COORDINATE_MAPPED_DYNAMIC"},
 "DHA-1738":{code:"DHA-1738",kind:"FORM",name:"Temporary Residence Visa",template:"immigrations_docs/FORM-DHA-1738_e-version.pdf",intelligence:"DHA-1738",status:"FIELD_MAPPED",registry:"DHA1738_FORM"},
 "BI-947":{code:"BI-947",kind:"FORM",name:"Permanent Residence Permit",template:"immigrations_docs/BI-947.pdf",intelligence:"BI-947",status:"COORDINATE_MAPPED_DYNAMIC"},
 "BI-1712A":{code:"BI-1712A",kind:"FORM",name:"Permanent Spousal Relationship Affidavit",template:"immigrations_docs/Spousal-RelationshipBI-1712A-Form-12-1.pdf",intelligence:"BI-1712A",status:"COORDINATE_MAPPED_DYNAMIC"},
 "DHA-49":{code:"DHA-49",kind:"FORM",name:"Notice of Appeal / Review",template:null,intelligence:"DHA-49",status:"GUIDED_INTAKE"},
 "SECTION-22":{code:"SECTION-22",kind:"REFUGEE",name:"Section 22 Asylum Seeker Permit workflow",template:null,intelligence:"SECTION-22",status:"EVIDENCE_WORKFLOW"},
 "SECTION-24":{code:"SECTION-24",kind:"REFUGEE",name:"Section 24 Refugee Status workflow",template:null,intelligence:"SECTION-24",status:"EVIDENCE_WORKFLOW"},
 "VISA-APPEAL-DG":{code:"VISA-APPEAL-DG",kind:"APPEAL",name:"Visa / Permanent Residence appeal to Director-General",template:"DHA-49",intelligence:"VISA-APPEAL-DG",status:"GUIDED_INTAKE"},
 "VISA-APPEAL-MINISTER":{code:"VISA-APPEAL-MINISTER",kind:"APPEAL",name:"Further visa / permanent residence appeal to Minister",template:"DHA-49",intelligence:"VISA-APPEAL-MINISTER",status:"GUIDED_INTAKE"},
 "WAIVER":{code:"WAIVER",kind:"MOTIVATION",name:"Immigration waiver / exceptional-circumstances workflow",template:null,intelligence:"WAIVER",status:"MOTIVATION_EVIDENCE_WORKFLOW"},
 "UNDESIRABILITY-REVIEW":{code:"UNDESIRABILITY-REVIEW",kind:"REVIEW",name:"Undesirability review / appeal workflow",template:null,intelligence:"UNDESIRABILITY-REVIEW",status:"EVIDENCE_REVIEW_WORKFLOW"}
});

export function getImmigrationWorkflow(code){
 const key=String(code||"").trim().toUpperCase();
 const workflow=IMMIGRATION_WORKFLOWS[key]||null;
 if(!workflow)return null;
 return {...workflow,formIntelligence:getImmigrationFormIntelligence(key)};
}
export function listImmigrationWorkflows(){return Object.values(IMMIGRATION_WORKFLOWS).map(w=>({...w,formIntelligence:getImmigrationFormIntelligence(w.code)}))}
export function workflowCapability(code){
 const w=getImmigrationWorkflow(code);
 if(!w)return{supported:false,reason:"Unknown immigration workflow."};
 const intelligence=w.formIntelligence;
 return {
  supported:true,code:w.code,name:w.name,status:w.status,
  intakeConfigured:Boolean(intelligence),
  pdfPopulation:["FIELD_MAPPED","COORDINATE_MAPPED_DYNAMIC"].includes(w.status),
  reviewBeforeSubmission:true,
  submissionControlledBy:"STAFF"
 };
}
export { getImmigrationFormIntelligence, listImmigrationFormIntelligence };
export default IMMIGRATION_WORKFLOWS;
