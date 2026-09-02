/**
 * Isaacs & Partners — Service AI Worker Registry
 * Central worker contract for every client-facing service domain.
 */

const WORKERS = Object.freeze({
    CLIENT_INTAKE: { id: "CLIENT_INTAKE", domains: ["ALL"], mode: "AI", responsibilities: ["identify_client_type", "create_blank_dashboard", "capture_service_request", "route_domain"] },
    CLIENT_WORKSPACE_ACTIVATION: { id: "CLIENT_WORKSPACE_ACTIVATION", domains: ["ALL"], mode: "STAFF_APPROVAL", responsibilities: ["keep_new_account_blank", "activate_full_ai_workspace_after_staff_or_super_admin_approval", "record_activation_decision"] },
    CONSULTATION: { id: "CONSULTATION", domains: ["ALL"], mode: "AI", responsibilities: ["run_free_30_minute_ai_consultation", "capture_facts", "identify_missing_information", "produce_consultation_summary"] },
    IMMIGRATION_QUALIFICATION: { id: "IMMIGRATION_QUALIFICATION", domains: ["IMMIGRATION"], mode: "AI", responsibilities: ["ask_qualifying_questions", "identify_possible_route", "flag_ineligibility_or_uncertainty", "build_requirements_context"] },
    REGULATORY_RESEARCH: { id: "REGULATORY_RESEARCH", domains: ["IMMIGRATION", "BUSINESS_COMPLIANCE"], mode: "SERVER_AI", responsibilities: ["search_current_authoritative_sources", "record_source_and_date", "compare_requirements", "never_present_estimate_as_binding_quote"] },
    DOCUMENT_INGESTION: { id: "DOCUMENT_INGESTION", domains: ["IMMIGRATION", "LEGAL", "HR_IR", "BUSINESS_COMPLIANCE"], mode: "TRUSTED_WORKER", responsibilities: ["retrieve_private_document", "integrity_check", "ocr_or_extract", "classify", "quality_check", "request_clarification"] },
    DOCUMENT_REQUIREMENTS: { id: "DOCUMENT_REQUIREMENTS", domains: ["IMMIGRATION", "LEGAL", "HR_IR", "BUSINESS_COMPLIANCE"], mode: "AI", responsibilities: ["build_dynamic_checklist", "detect_missing_documents", "detect_expired_documents", "match_document_to_requirement"] },
    DOCUMENT_UNDERSTANDING: { id: "DOCUMENT_UNDERSTANDING", domains: ["ALL"], mode: "AI", responsibilities: ["understand_full_document", "detect_low_confidence_text", "ask_client_clarification", "reprocess_after_answer"] },
    IMMIGRATION_ESTIMATE: { id: "IMMIGRATION_ESTIMATE", domains: ["IMMIGRATION"], mode: "AI_SERVER", responsibilities: ["estimate_professional_work", "separate_authority_fees", "use_current_research", "show_estimate_range", "route_to_staff_for_binding_quote"] },
    LEGAL_SCOPING: { id: "LEGAL_SCOPING", domains: ["LEGAL"], mode: "AI_HUMAN_GATE", responsibilities: ["scope_hourly_work", "count_document_work", "identify_paid_consultation", "route_legal_advice_to_human"] },
    HR_IR_TRIAGE: { id: "HR_IR_TRIAGE", domains: ["HR_IR"], mode: "AI_HUMAN_GATE", responsibilities: ["classify_hr_ir_matter", "capture_employees_or_parties", "identify_urgency", "route_to_staff", "never_complete_human_hearing_representation_autonomously"] },
    BUSINESS_COMPLIANCE_ESTIMATE: { id: "BUSINESS_COMPLIANCE_ESTIMATE", domains: ["BUSINESS_COMPLIANCE"], mode: "AI_SERVER_HUMAN_GATE", responsibilities: ["research_market_reference_price", "apply_39_percent_markup", "analyse_1250_retainer", "recommend_staff_price", "prepare_quote_draft"] },
    PRICING: { id: "PRICING", domains: ["ALL"], mode: "DETERMINISTIC", responsibilities: ["apply_service_pricing_policy", "separate_vat", "separate_authority_fees", "calculate_deposit_and_balance", "never_override_admin_rates"] },
    HUMAN_ESCALATION: { id: "HUMAN_ESCALATION", domains: ["ALL"], mode: "HUMAN", responsibilities: ["assign_staff", "notify_staff", "capture_reason", "preserve_ai_context", "require_human_approval"] },
    QUOTE: { id: "QUOTE", domains: ["IMMIGRATION", "LEGAL", "BUSINESS_COMPLIANCE", "HR_IR"], mode: "HUMAN_APPROVAL", responsibilities: ["prepare_quote_draft", "send_to_staff_review", "send_approved_quote_to_customer_inbox", "record_terms"] },
    PAYMENT_GATE: { id: "PAYMENT_GATE", domains: ["ALL"], mode: "DETERMINISTIC", responsibilities: ["enforce_payment_state", "block_paid_work_before_required_deposit", "enforce_final_balance_before_submission"] },
    APPLICATION_PREPARATION: { id: "APPLICATION_PREPARATION", domains: ["IMMIGRATION"], mode: "AI_HUMAN_QC", responsibilities: ["populate_forms", "assemble_bundle", "generate_index", "generate_cover_sheet", "flag_outstanding_items", "require_quality_control"] },
    CLIENT_COMMUNICATION: { id: "CLIENT_COMMUNICATION", domains: ["ALL"], mode: "AI_ASSISTED", responsibilities: ["status_updates", "missing_document_requests", "clarification_requests", "quote_notifications", "submission_readiness_notifications"] },
    AUDIT: { id: "AUDIT", domains: ["ALL"], mode: "SYSTEM", responsibilities: ["record_worker_execution", "record_sources", "record_pricing_inputs", "record_human_decisions", "preserve_provenance"] }
});

export function getServiceWorkers(domain = "ALL") {
    const normalised = String(domain).trim().toUpperCase();
    return Object.values(WORKERS).filter((worker) => worker.domains.includes("ALL") || worker.domains.includes(normalised));
}

export function getWorker(workerId) {
    return WORKERS[String(workerId).trim().toUpperCase()] || null;
}

export function getAllWorkers() {
    return Object.values(WORKERS);
}

export default WORKERS;
