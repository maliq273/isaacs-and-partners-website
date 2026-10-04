/**
 * Isaacs & Partners — Immigration Form Intelligence Registry
 *
 * Single source for Anthony's immigration intake routing:
 * - who supplies an answer/evidence;
 * - what Anthony asks for;
 * - what document proves it;
 * - which official form/workflow receives it;
 * - whether PDF population is verified.
 *
 * This registry does not give Hindsight, model reasoning, or memory authority
 * to override live matter records, permissions, legal sources, or staff approval.
 */

const P = {
  CLIENT: "CLIENT",
  SA_PARTNER: "SA_PARTNER",
  HOST: "HOST",
  EMPLOYER: "EMPLOYER",
  EDUCATION_PROFESSIONAL_BODY: "EDUCATION_PROFESSIONAL_BODY",
  MEDICAL_PROVIDER: "MEDICAL_PROVIDER",
  POLICE_AUTHORITY: "POLICE_AUTHORITY",
  STAFF: "STAFF",
  SUPER_ADMIN: "SUPER_ADMIN"
};

const evidence = (key, label, supplier, options = {}) => ({
  key, label, supplier, required: options.required !== false,
  conditionalOn: options.conditionalOn || null,
  ask: options.ask || label,
  formFields: options.formFields || [],
  notes: options.notes || null
});

const baseApplicant = [
  evidence("identity.full_name", "Full legal name", P.CLIENT, {formFields:["identity.surname","identity.first_names"]}),
  evidence("identity.date_of_birth", "Date of birth", P.CLIENT, {formFields:["identity.date_of_birth"]}),
  evidence("identity.country_of_birth", "Country of birth", P.CLIENT, {formFields:["identity.country_of_birth"]}),
  evidence("identity.nationality", "Current nationality", P.CLIENT, {formFields:["identity.nationality"]}),
  evidence("passport.number", "Passport / travel-document number", P.CLIENT, {formFields:["passport.number"]}),
  evidence("passport.expiry_date", "Passport expiry date", P.CLIENT, {formFields:["passport.expiry_date"]}),
  evidence("contact.email", "Email address", P.CLIENT, {formFields:["contact.email"]}),
  evidence("contact.phone", "Telephone / mobile number", P.CLIENT, {formFields:["contact.phone"]}),
  evidence("residence.address", "Current residential address", P.CLIENT, {formFields:["residence.address"]}),
  evidence("immigration.current_status", "Current South African immigration status", P.CLIENT, {required:false, formFields:["immigration.current_status"]}),
  evidence("immigration.previous_history", "Previous South African visas, refusals, removals or deportations", P.CLIENT, {required:false, formFields:["immigration.previous_history"]})
];

export const IMMIGRATION_FORM_INTELLIGENCE = Object.freeze({
  "DHA-1738": {
    workflowCode:"DHA-1738", formNumber:"Form 8", mode:"FIELD_MAPPED",
    template:"immigrations_docs/FORM-DHA-1738_e-version.pdf",
    populationStatus:"OPERATIONAL",
    applicant:baseApplicant,
    askInOrder:[
      "visa.category_and_purpose","identity.full_name","identity.date_of_birth","identity.nationality",
      "passport.number","passport.issue_country","passport.issue_date","passport.expiry_date",
      "residence.address","contact.email","contact.phone","immigration.current_status",
      "employment.employer","employment.job_title","employment.occupation","employment.salary",
      "employment.work_location","qualification","professional_registration","saqa",
      "medical_report","police_clearance","yellow_fever","employer_undertakings",
      "prior_refusal_or_deportation"
    ],
    suppliers:{
      CLIENT:["identity","passport","residence","contact","immigration","qualification","medical_report","police_clearance"],
      EMPLOYER:["employment.offer","employment.contract","employer_undertakings","employer_details"],
      EDUCATION_PROFESSIONAL_BODY:["professional_registration","professional_body_confirmation","saqa"],
      STAFF:["matter_review","checklist_review","quote","payment_gate"],
      SUPER_ADMIN:["pricing_or_exception_approval"]
    },
    evidence:[
      evidence("passport","Valid passport",P.CLIENT,{formFields:["passport.number"]}),
      evidence("offer_of_employment","Signed offer / employment contract",P.EMPLOYER,{formFields:["employment.employer","employment.job_title","employment.occupation"]}),
      evidence("qualification","Critical-skills qualification evidence",P.CLIENT,{formFields:["qualification"]}),
      evidence("professional_body","Professional-body/council/board confirmation where legally required",P.EDUCATION_PROFESSIONAL_BODY,{required:false}),
      evidence("saqa","SAQA evidence where required",P.EDUCATION_PROFESSIONAL_BODY,{required:false}),
      evidence("medical_report","Medical report",P.MEDICAL_PROVIDER,{required:true}),
      evidence("police_clearance","Police clearance where required",P.POLICE_AUTHORITY,{required:true}),
      evidence("yellow_fever","Yellow-fever certificate where applicable",P.CLIENT,{required:false}),
      evidence("employer_undertakings","Employer undertakings",P.EMPLOYER,{required:true}),
      evidence("payment","Application payment",P.STAFF,{required:true,notes:"Anthony may check status; staff/admin control the payment gate."})
    ],
    output:{form:"DHA-1738",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "DHA-84": {
    workflowCode:"DHA-84", formNumber:"Form 11", mode:"COORDINATE_MAPPED",
    template:"immigrations_docs/Visitor-Visa-Application-Form-DHA-84-Form-11-June-19-2014.pdf",
    populationStatus:"COORDINATE_VERIFICATION_REQUIRED",
    askInOrder:[
      "identity.full_name","identity.maiden_name","identity.previous_names","identity.date_of_birth",
      "identity.country_of_birth","identity.gender","identity.nationality","identity.nationality_acquisition",
      "passport.number","passport.issue_country","passport.expiry_date","passport.document_type",
      "residence.normal_address","residence.period","residence.country",
      "contact.phone","contact.home_phone","contact.email",
      "employment.occupation","employment.employer","employment.employer_address","employment.employer_phone",
      "marital.status","marital.spouse_details",
      "visit.arrival_date","visit.arrival_place","visit.purpose","visit.duration","visit.entries",
      "visit.sa_address","visit.host_name","visit.host_phone","visit.contacts",
      "history.permanent_settlement_application","history.refused_entry","history.deported",
      "history.criminal_conviction","history.pending_criminal_action","history.insolvency",
      "history.health_declaration","history.judicial_incompetence","history.security_association",
      "history.affirmative_details",
      "transit.destination","transit.mode","transit.departure_date_port","transit.destination_visa"
    ],
    suppliers:{
      CLIENT:["personal_particulars","travel_history","visit_purpose","security_declarations","transit_details"],
      HOST:["host_identity","host_address","host_phone","invitation","financial_undertaking"],
      EMPLOYER:["event_or_work_confirmation"],
      STAFF:["form_review","document_check","submission_gate"],
      SUPER_ADMIN:["exceptions_or_pricing_approval"]
    },
    evidence:[
      evidence("passport","Valid passport / travel document",P.CLIENT),
      evidence("financial_means","Proof of sufficient financial means",P.CLIENT),
      evidence("return_onward_ticket","Return / onward ticket or arrangement",P.CLIENT),
      evidence("purpose_duration","Purpose and duration evidence / invitation",P.CLIENT,{formFields:["visit.purpose","visit.duration"]}),
      evidence("host_invitation","Host invitation and host identity/residence evidence",P.HOST,{required:false}),
      evidence("child_consent","Parental consent / custody evidence for dependant child where applicable",P.CLIENT,{required:false}),
      evidence("event_confirmation","Event/activity confirmation where applicable",P.EMPLOYER,{required:false}),
      evidence("transit_destination_visa","Destination visa/permit where transit route requires it",P.CLIENT,{required:false})
    ],
    output:{form:"DHA-84",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "BI-947": {
    workflowCode:"BI-947", formNumber:"Form 18", mode:"COORDINATE_MAPPED",
    template:"immigrations_docs/BI-947.pdf",
    populationStatus:"COORDINATE_VERIFICATION_REQUIRED",
    askInOrder:[
      "pr.category_or_ground","identity.title","identity.full_name","identity.former_names",
      "identity.date_of_birth","identity.country_of_birth","identity.nationality",
      "passport.number","passport.issue_country","marital.status","marital.history",
      "residence.current_address","residence.postal_address","contact.phone","contact.email",
      "immigration.temporary_permit_history","family.parents","family.spouse","family.children",
      "family.sa_relatives","employment.full_history","employment.current_or_last_duties",
      "employment.intended_sa_occupation","finance.funds_to_transfer","finance.pension_income","finance.assets",
      "language.proficiency","origin.family_remaining",
      "history.criminal","history.insolvency","history.civil_actions","history.debts",
      "history.pending_enquiries","history.pr_refusals","history.removals_deportations",
      "history.previous_sa_residence","health.required_declarations","history.other_spousal_relationships",
      "history.asylum_elsewhere","sa.contact_and_spouse_employment"
    ],
    suppliers:{
      CLIENT:["personal_details","passport","family","history","employment","finance","health"],
      SA_PARTNER:["spouse_identity","relationship_evidence","spouse_employment","sa_status"],
      EMPLOYER:["employment_confirmation","contract_if_applicable"],
      EDUCATION_PROFESSIONAL_BODY:["qualification_or_professional_evidence_if_category_requires"],
      MEDICAL_PROVIDER:["medical_and_radiological_reports_if_required"],
      POLICE_AUTHORITY:["police_certificates_if_required"],
      STAFF:["category_review","form_review","document_check","submission_gate"],
      SUPER_ADMIN:["exceptions_or_pricing_approval"]
    },
    evidence:[
      evidence("passport","Valid passport / identity document",P.CLIENT),
      evidence("birth_record","Birth record",P.CLIENT),
      evidence("medical","Medical/radiological reports where required",P.MEDICAL_PROVIDER,{required:false}),
      evidence("police","Police certificates where required",P.POLICE_AUTHORITY,{required:false}),
      evidence("marriage_divorce_custody","Marriage/divorce/custody documents where applicable",P.CLIENT,{required:false}),
      evidence("category_evidence","Evidence for the selected permanent-residence category",P.CLIENT),
      evidence("employment_evidence","Qualification/work/employment evidence where category requires it",P.EMPLOYER,{required:false})
    ],
    output:{form:"BI-947",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "BI-1712A": {
    workflowCode:"BI-1712A", formNumber:"Form 12", mode:"COORDINATE_MAPPED",
    template:"immigrations_docs/Spousal-RelationshipBI-1712A-Form-12-1.pdf",
    populationStatus:"COORDINATE_VERIFICATION_REQUIRED",
    askInOrder:[
      "relationship.part","sa_partner.identity","sa_partner.gender","sa_partner.address",
      "sa_partner.id_or_passport","sa_partner.nationality","sa_partner.date_of_birth","sa_partner.first_entry",
      "sa_partner.permit_type","sa_partner.permit_expiry",
      "foreign_partner.identity","foreign_partner.address","foreign_partner.passport","foreign_partner.date_of_birth",
      "foreign_partner.place_of_birth","foreign_partner.nationality","foreign_partner.first_entry",
      "foreign_partner.visa_or_permit","foreign_partner.permit_expiry",
      "relationship.duration","relationship.permanence_and_exclusivity","relationship.cohabitation",
      "relationship.financial_support","relationship.other_marriages_or_spousal_relationships",
      "relationship.children","relationship.evidence",
      "partB.prior_affidavit_date","partB.relationship_still_exists"
    ],
    suppliers:{
      CLIENT:["foreign_partner_details","relationship_history","relationship_evidence","children"],
      SA_PARTNER:["citizen_or_pr_identity","relationship_evidence","children"],
      STAFF:["relationship_review","commissioner_check","submission_gate"],
      SUPER_ADMIN:["exceptions_or_pricing_approval"]
    },
    evidence:[
      evidence("sa_partner_identity","SA citizen/PR identity evidence",P.SA_PARTNER),
      evidence("foreign_partner_identity","Foreign partner passport/permit evidence",P.CLIENT),
      evidence("relationship_evidence","Cohabitation and shared financial responsibility evidence",P.CLIENT),
      evidence("prior_marriage_dissolution","Divorce/death evidence where applicable",P.CLIENT,{required:false}),
      evidence("children","Children particulars / supporting records where applicable",P.CLIENT,{required:false}),
      evidence("commissioner_execution","Both signatures and Commissioner of Oaths execution",P.CLIENT)
    ],
    output:{form:"BI-1712A",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "DHA-49": {
    workflowCode:"DHA-49", formNumber:"Form 49", mode:"GUIDED_INTAKE",
    populationStatus:"GUIDED_INTAKE",
    askInOrder:[
      "appeal.reference_number","appeal.office_of_application","appeal.application_date",
      "identity.surname","identity.first_names","identity.date_of_birth","identity.country_of_birth",
      "identity.nationality","passport.number","residence.address","contact.phone","contact.email",
      "appeal.rejection_received_date","appeal.grounds_and_reasons","appeal.supporting_evidence","appeal.stage"
    ],
    suppliers:{
      CLIENT:["personal_details","rejection_letter","rejection_received_date","grounds_and_evidence"],
      STAFF:["appeal_deadline_check","legal_issue_review","form_review","submission_gate"],
      SUPER_ADMIN:["commercial_approval_or_exception"]
    },
    evidence:[
      evidence("rejection_letter","Copy of rejection letter",P.CLIENT),
      evidence("appeal_reasons","Detailed reasons/grounds for appeal",P.CLIENT),
      evidence("supporting_documents","Documents supporting appeal",P.CLIENT),
      evidence("deadline_evidence","Evidence of date rejection was received",P.CLIENT),
      evidence("legal_review","Staff/legal review before submission",P.STAFF)
    ],
    output:{form:"DHA-49",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "SECTION-22": {
    workflowCode:"SECTION-22", formNumber:"Section 22 asylum seeker permit/visa workflow", mode:"GUIDED_INTAKE",
    populationStatus:"EVIDENCE_WORKFLOW",
    askInOrder:[
      "asylum.identity","asylum.nationality","asylum.country_of_origin","asylum.family",
      "asylum.route_and_entry","asylum.date_of_entry","asylum.refugee_reasons",
      "asylum.persecution_or_harm","asylum.internal_relocation","asylum.evidence",
      "asylum.current_permit","asylum.reception_office","asylum.previous_claims"
    ],
    suppliers:{
      CLIENT:["identity","asylum_narrative","entry_history","supporting_evidence"],
      FAMILY_MEMBER:["dependent_or_family_facts_if_applicable"],
      STAFF:["credibility/document_review","RRO_process_review","submission_gate"],
      SUPER_ADMIN:["exception_or_commercial_approval"]
    },
    evidence:[
      evidence("passport_or_identity","Passport or available identity evidence",P.CLIENT,{required:false}),
      evidence("entry_evidence","Entry/travel evidence",P.CLIENT,{required:false}),
      evidence("asylum_narrative","Detailed asylum narrative and chronology",P.CLIENT),
      evidence("persecution_evidence","Evidence supporting claimed persecution/harm where available",P.CLIENT,{required:false}),
      evidence("family_evidence","Family/dependant evidence where applicable",P.CLIENT,{required:false}),
      evidence("existing_permit","Existing Section 22 / asylum documentation",P.CLIENT,{required:false})
    ],
    output:{workflow:"SECTION-22",submissionReady:false,submissionActor:P.STAFF}
  },

  "SECTION-24": {
    workflowCode:"SECTION-24", formNumber:"Section 24 refugee status workflow", mode:"GUIDED_INTAKE",
    populationStatus:"EVIDENCE_WORKFLOW",
    askInOrder:[
      "asylum.identity","asylum.nationality","asylum.country_of_origin","asylum.family",
      "asylum.claim_history","asylum.refugee_reasons","asylum.persecution_or_harm",
      "asylum.evidence","asylum.rsd_outcome","asylum.current_section22",
      "asylum.reception_office","asylum.appeal_or_review_history"
    ],
    suppliers:{
      CLIENT:["identity","refugee_claim","supporting_evidence","RSD_history"],
      FAMILY_MEMBER:["family_facts_if_applicable"],
      STAFF:["RSD/document_review","appeal_or_review_routing","submission_gate"],
      SUPER_ADMIN:["exception_or_commercial_approval"]
    },
    evidence:[
      evidence("identity","Identity/passport evidence where available",P.CLIENT,{required:false}),
      evidence("refugee_claim","Detailed refugee-status narrative",P.CLIENT),
      evidence("supporting_evidence","Evidence supporting the claim",P.CLIENT,{required:false}),
      evidence("section22","Existing Section 22 documentation where applicable",P.CLIENT,{required:false}),
      evidence("RSD_decision","Refugee Status Determination outcome/decision",P.CLIENT,{required:false})
    ],
    output:{workflow:"SECTION-24",submissionReady:false,submissionActor:P.STAFF}
  },

  "WAIVER": {
    workflowCode:"WAIVER", formNumber:"DHA-Form 48", mode:"GUIDED_INTAKE",
    populationStatus:"MOTIVATION_EVIDENCE_WORKFLOW",
    askInOrder:[
      "waiver.requirement_to_be_waived","waiver.legal_or_regulatory_reference","waiver.reasons",
      "identity.personal_details","passport.details","residence.address","contact.details",
      "immigration.current_status","immigration.permit_history","employment.details",
      "family.details","history.criminal_or_civil","history.health_declarations",
      "waiver.supporting_evidence","waiver.motivation","waiver.employer_or_institution_background"
    ],
    suppliers:{
      CLIENT:["personal_details","passport","residence","immigration_history","motivation_facts"],
      EMPLOYER:["employer_signed_letter","contract","company_background","motivation_for_work_requirement"],
      STAFF:["legal_requirement_review","motivation_drafting","document_review","submission_gate"],
      SUPER_ADMIN:["exception_or_commercial_approval"]
    },
    evidence:[
      evidence("waiver_motivation","Comprehensive motivation for each requirement to be waived",P.CLIENT),
      evidence("passport_permits","Passport and temporary residence permits",P.CLIENT),
      evidence("cv","Curriculum vitae",P.CLIENT),
      evidence("employment_contract","Signed employment contract where applicable",P.EMPLOYER,{required:false}),
      evidence("company_background","Company/institution background where applicable",P.EMPLOYER,{required:false}),
      evidence("financial_or_business","Business plan, bank/financial statements or relevant category evidence",P.CLIENT,{required:false})
    ],
    output:{form:"DHA-48",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "UNDESIRABILITY-REVIEW": {
    workflowCode:"UNDESIRABILITY-REVIEW", formNumber:"DHA-46 / written review workflow", mode:"GUIDED_INTAKE",
    populationStatus:"EVIDENCE_REVIEW_WORKFLOW",
    askInOrder:[
      "undesirability.decision_or_notice","undesirability.date_received","undesirability.ground",
      "identity.personal_details","passport.details","immigration.history","travel_history",
      "undesirability.factual_response","undesirability.supporting_evidence",
      "undesirability.remedy_requested","undesirability.deadline"
    ],
    suppliers:{
      CLIENT:["notice_or_declaration","personal_details","factual_response","evidence"],
      STAFF:["statutory_basis_review","deadline_check","written_representation_review","submission_gate"],
      SUPER_ADMIN:["commercial_approval_or_exception"]
    },
    evidence:[
      evidence("undesirability_notice","Declaration/notice identifying undesirability and ground",P.CLIENT),
      evidence("passport","Passport and relevant visa/permit pages",P.CLIENT),
      evidence("travel_history","Entry/exit and overstay evidence where relevant",P.CLIENT,{required:false}),
      evidence("factual_response","Evidence-based response to the stated ground",P.CLIENT),
      evidence("supporting_documents","Supporting documentary evidence",P.CLIENT,{required:false}),
      evidence("staff_legal_review","Staff/legal review before submission",P.STAFF)
    ],
    output:{form:"DHA-46 / written representation",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "VISA-APPEAL-DG": {
    workflowCode:"VISA-APPEAL-DG", formNumber:"DHA-49", mode:"GUIDED_INTAKE",
    populationStatus:"GUIDED_INTAKE",
    askInOrder:["appeal.rejection_letter","appeal.rejection_received_date","appeal.reference_number","appeal.reasons","appeal.evidence","identity.personal_details","passport.details","contact.details"],
    suppliers:{CLIENT:["rejection_letter","date_received","grounds","evidence"],STAFF:["deadline_and_legal_review","form_review","submission_gate"],SUPER_ADMIN:["commercial_approval"]},
    evidence:[evidence("rejection_letter","Rejection letter",P.CLIENT),evidence("grounds","Appeal grounds",P.CLIENT),evidence("supporting_evidence","Supporting evidence",P.CLIENT),evidence("staff_review","Staff review",P.STAFF)],
    output:{form:"DHA-49",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  },

  "VISA-APPEAL-MINISTER": {
    workflowCode:"VISA-APPEAL-MINISTER", formNumber:"DHA-49 / further appeal workflow", mode:"GUIDED_INTAKE",
    populationStatus:"GUIDED_INTAKE",
    askInOrder:["appeal.dg_decision","appeal.dg_decision_date","appeal.reasons","appeal.evidence","appeal.previous_submission","identity.personal_details"],
    suppliers:{CLIENT:["DG_decision","appeal_grounds","supporting_evidence"],STAFF:["deadline_and_legal_review","submission_gate"],SUPER_ADMIN:["commercial_approval"]},
    evidence:[evidence("dg_decision","Director-General decision",P.CLIENT),evidence("prior_appeal","Prior appeal record",P.CLIENT),evidence("grounds","Further appeal grounds",P.CLIENT),evidence("supporting_evidence","Supporting evidence",P.CLIENT),evidence("staff_review","Staff review",P.STAFF)],
    output:{workflow:"VISA-APPEAL-MINISTER",reviewStatus:"NEEDS_REVIEW",submissionReady:false,submissionActor:P.STAFF}
  }
});

export function getImmigrationFormIntelligence(code){
  const key=String(code||"").trim().toUpperCase();
  return IMMIGRATION_FORM_INTELLIGENCE[key]||null;
}

export function listImmigrationFormIntelligence(){
  return Object.values(IMMIGRATION_FORM_INTELLIGENCE);
}

export function resolveImmigrationQuestion(code,key){
  const spec=getImmigrationFormIntelligence(code);
  if(!spec)return null;
  const match=String(key||"");
  const all=(spec.askInOrder||[]).map(k=>({key:k,source:(spec.suppliers?.CLIENT||[]).includes(k.split(".")[0])?"CLIENT":"WORKFLOW"}));
  return all.find(x=>x.key===match)||null;
}

export function requiredEvidenceFor(code){
  const spec=getImmigrationFormIntelligence(code);
  return (spec?.evidence||[]).filter(x=>x.required!==false);
}

export { P as IMMIGRATION_PARTIES };
