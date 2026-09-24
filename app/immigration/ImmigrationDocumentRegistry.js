/**
 * ImmigrationDocumentRegistry
 * Canonical registry for every immigration PDF stored in /immigrations_docs.
 *
 * Government/reference PDFs remain the source templates. The application data
 * model is deliberately separate from the visual form so the same applicant
 * information can populate multiple forms without duplication.
 */

const ROOT = "/immigrations_docs/";

export const IMMIGRATION_DOCUMENTS = Object.freeze([
  ["37335gen97.pdf","REFERENCE","Government Gazette / immigration reference"],
  ["42932rg11024gon1707.pdf","REFUGEE_REGULATIONS","Refugees Act Regulations / prescribed forms"],
  ["53853-12-12-HomeAffairs.pdf","REFERENCE","Home Affairs immigration reference"],
  ["53853gon6947.pdf","REFERENCE","Government Gazette / immigration reference"],
  ["55016gon7714.pdf","REFERENCE","Government Gazette / immigration reference"],
  ["55209rg12036gon7834.pdf","REFERENCE","Government Gazette / immigration reference"],
  ["BI-947.pdf","FORM","Permanent residence application / Form 18"],
  ["Concession_of_30_March_2026.pdf","POLICY","Current concession / policy material"],
  ["Confirmation-of-Capital-and-Financial-Contribution.pdf","SUPPORTING_FORM","Financial/capital supporting declaration"],
  ["DHA-DIRECTIVES-19-14-ICT-ext-in-country-moha.pdf","DIRECTIVE","ICT extension / in-country directive"],
  ["FORM-DHA-1738_e-version.pdf","FORM","DHA-1738 / Form 8 temporary residence visa"],
  ["Immigration-Directive-22.pdf","DIRECTIVE","Immigration Directive 22"],
  ["List-of-Businesses-Qualifying-for-Reduction-or-Waiver.pdf","REFERENCE_LIST","Businesses qualifying for reduction/waiver"],
  ["List-of-Critical-Skils-or-Qualifications.pdf","REFERENCE_LIST","Critical skills / qualifications list"],
  ["List-of-Undesirable-Business-Undertakings.pdf","REFERENCE_LIST","Undesirable business undertakings"],
  ["Spousal-RelationshipBI-1712A-Form-12-1.pdf","FORM","BI-1712A / Form 12 relationship affidavit"],
  ["Temporary-Residence-Form-DHA-1738-Form-8-June-19-2014.pdf","FORM","DHA-1738 / Form 8 temporary residence visa"],
  ["Travelling-with-minors-info-DHA-latest-version.pdf","REFERENCE","DHA travelling-with-minors guidance"],
  ["Visitor-Visa-Application-Form-DHA-84-Form-11-June-19-2014.pdf","FORM","DHA-84 / Form 11 visitor/port-of-entry visa"],
  ["dha84-form11.pdf","FORM","DHA-84 / Form 11 duplicate template"],
  ["final_Immigration_Regulations_2014_1 (1).pdf","REGULATIONS","Immigration Regulations"]
].map(([file,type,description])=>Object.freeze({
  file,type,description,
  repositoryPath: ROOT + file,
  sourceAuthority: ["FORM","SUPPORTING_FORM"].includes(type) ? "DHA" : "SOUTH_AFRICAN_GOVERNMENT",
  preserveOriginal: true,
  currentVerificationRequired: true
})));

export const FORM_TEMPLATES = Object.freeze({
  DHA_84: "immigrations_docs/dha84-form11.pdf",
  DHA_1738: "immigrations_docs/FORM-DHA-1738_e-version.pdf",
  BI_947: "immigrations_docs/BI-947.pdf",
  BI_1712A: "immigrations_docs/Spousal-RelationshipBI-1712A-Form-12-1.pdf"
});

export const IMMIGRATION_CASE_TYPES = Object.freeze({
  TEMPORARY_RESIDENCE: "temporary_residence",
  VISITOR_VISA: "visitor_visa",
  WORK_VISA: "work_visa",
  CRITICAL_SKILLS: "critical_skills",
  GENERAL_WORK: "general_work",
  INTRA_COMPANY_TRANSFER: "intra_company_transfer",
  BUSINESS_VISA: "business_visa",
  RELATIVE_VISA: "relative_visa",
  STUDY_VISA: "study_visa",
  RETIREMENT_VISA: "retirement_visa",
  MEDICAL_VISA: "medical_treatment_visa",
  PERMANENT_RESIDENCE: "permanent_residence",
  SECTION_22: "section_22_asylum",
  SECTION_24: "section_24_refugee_status",
  REFUGEE_APPEAL: "refugee_appeal",
  IMMIGRATION_APPEAL: "immigration_appeal",
  WAIVER: "waiver",
  REVIEW: "administrative_review"
});

export function getImmigrationDocument(file) {
  return IMMIGRATION_DOCUMENTS.find(x=>x.file===file) || null;
}

export function getTemplateForCase(caseType) {
  const key = String(caseType || "").toLowerCase();
  if (key.includes("visitor")) return FORM_TEMPLATES.DHA_84;
  if (key.includes("temporary") || key.includes("work_visa") || key.includes("critical_skills") ||
      key.includes("general_work") || key.includes("intra_company") || key.includes("business_visa") ||
      key.includes("relative_visa") || key.includes("study_visa") || key.includes("retirement") ||
      key.includes("medical")) return FORM_TEMPLATES.DHA_1738;
  if (key.includes("permanent_residence")) return FORM_TEMPLATES.BI_947;
  if (key.includes("spousal")) return FORM_TEMPLATES.BI_1712A;
  return null;
}

export function listImmigrationTemplates() {
  return IMMIGRATION_DOCUMENTS.filter(x=>x.type==="FORM" || x.type==="SUPPORTING_FORM");
}

export default IMMIGRATION_DOCUMENTS;
