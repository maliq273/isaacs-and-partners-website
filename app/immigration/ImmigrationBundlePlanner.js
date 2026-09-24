import {getTemplateForCase,IMMIGRATION_CASE_TYPES} from "./ImmigrationDocumentRegistry.js";

const SUPPORT = {
  temporary_residence:["passport","current_status","proof_of_address","medical_report","radiological_report","police_clearance","visa_specific_support"],
  visitor_visa:["passport","proof_of_funds","return_or_onward_ticket","accommodation","purpose_of_visit"],
  critical_skills:["passport","qualification","SAQA_or_required_qualification_evidence","professional_registration_if_applicable","employment_or_placement_evidence","police_clearance","medical_report"],
  general_work:["passport","employment_contract","employer_support","required_labour_department_evidence","qualification_and_experience","police_clearance","medical_report"],
  intra_company_transfer:["passport","foreign_employer_letter","SA_employer_letter","corporate_relationship_evidence","transfer_duties","police_clearance","medical_report"],
  business_visa:["passport","business_plan","capital_evidence","business_registration","ownership_evidence","financial_contribution_confirmation","police_clearance","medical_report"],
  section_22_asylum:["passport_or_identity_document_if_available","asylum_narrative","supporting_evidence","entry_history","family_information"],
  section_24_refugee_status:["section_22_document","asylum_file_reference","RSDO_decision","identity_document","supporting_evidence"],
  refugee_appeal:["refusal_or_decision","appeal_grounds","evidence","identity_document","section_22_or_refugee_documents","previous_submissions"],
  immigration_appeal:["refusal_or_negative_decision","passport","original_application","appeal_grounds","supporting_evidence","previous_correspondence"],
  permanent_residence:["passport","birth_certificate","police_clearance","medical_report","radiological_report","marital_or_spousal_documents_if_applicable","dependent_documents_if_applicable"]
};

export default class ImmigrationBundlePlanner {
  plan({caseType,answers={},documents=[]}={}) {
    const type=String(caseType||"temporary_residence").toLowerCase();
    const template=getTemplateForCase(type);
    const required=SUPPORT[type]||SUPPORT.temporary_residence;
    const supplied=new Set((documents||[]).map(d=>String(d.type||d.category||d.key||"").toLowerCase()));
    const checklist=required.map(key=>({
      key,
      required:true,
      supplied:[...supplied].some(x=>x.includes(key.replaceAll("_"," "))) || supplied.has(key),
      status:"PENDING"
    }));
    const outstanding=checklist.filter(x=>!x.supplied);
    return {
      caseType:type,
      template,
      documents:checklist,
      outstanding,
      readyForGeneration:!!template && outstanding.length===0,
      answerSnapshot:answers
    };
  }

  buildSubmissionManifest({caseType,generatedForm,documents=[],reviewStatus="DRAFT"}={}) {
    return {
      bundleType:"IMMIGRATION_APPLICATION",
      caseType,
      reviewStatus,
      generatedAt:new Date().toISOString(),
      files:[
        generatedForm ? {role:"PRIMARY_FORM",...generatedForm}:null,
        ...(documents||[]).map(x=>({role:"SUPPORTING_DOCUMENT",...x}))
      ].filter(Boolean)
    };
  }
}
