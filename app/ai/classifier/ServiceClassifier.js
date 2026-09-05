import { PUBLIC_SERVICE_DIRECTORY } from "../../communication/public/PublicServiceDirectory.js";

function normalise(value) { return String(value || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }

function distance(a, b) {
    const left = String(a); const right = String(b); const row = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 1; i <= left.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= right.length; j++) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1)); previous = current; } }
    return row[right.length];
}

const DOMAIN_RULES = [
    { value: "IMMIGRATION", keywords: ["visa", "immigration", "dha", "vfs", "permanent residence", "citizenship", "refugee", "asylum"] },
    { value: "HR_IR", keywords: ["ccma", "labour", "labor", "employment", "employee", "industrial relations", "disciplinary", "grievance", "performance", "misconduct", "dismissal", "retrenchment", "bargaining council", "hr"] },
    { value: "BUSINESS_COMPLIANCE", keywords: ["cipc", "sars", "uif", "coida", "tax", "business registration", "company registration", "compliance", "vat", "paye"] },
    { value: "LEGAL", keywords: ["contract", "legal", "affidavit", "power of attorney", "settlement", "legal opinion", "notary", "notarial", "mediation", "negotiation"] }
];

const SERVICE_ALIASES = [
    ["ccma", "ccma-representation", "CCMA Representation"], ["ccma hearing", "ccma-representation", "CCMA Representation"],
    ["disciplinary hearing", "disciplinary-hearings", "Disciplinary Hearings"], ["grievance hearing", "grievance-hearings", "Grievance Hearings"],
    ["retrenchment", "retrenchment-consulting", "Retrenchment Consulting"], ["bargaining council", "bargaining-council-matters", "Bargaining Council Matters"],
    ["employment contract", "employment-contracts", "Employment Contracts"], ["hr policy", "hr-policies", "HR Policies"],
    ["performance management", "performance-management", "Performance Management"], ["payroll", "payroll-advisory", "Payroll Advisory"],
    ["work visa", "work-visas", "Work Visas"], ["critical skills", "critical-skills-visas", "Critical Skills Visas"],
    ["general work visa", "general-work-visas", "General Work Visas"], ["business visa", "business-visas", "Business Visas"],
    ["permanent residence", "permanent-residence", "Permanent Residence"], ["citizenship", "citizenship-applications", "Citizenship Applications"],
    ["section 22", "section-22-applications", "Section 22 Applications"], ["section 24", "section-24-applications", "Section 24 Applications"],
    ["visa appeal", "visa-appeals", "Visa Appeals"], ["company registration", "company-registration", "Company Registration"],
    ["cipc", "cipc-amendments", "CIPC Amendments"], ["sars", "sars-registration", "SARS Registration"],
    ["vat", "vat-registration", "VAT Registration"], ["uif", "uif-registration", "UIF Registration"],
    ["coida", "coida-registration", "COIDA Registration"], ["business bank", "business-bank-account", "Business Bank Account Setup"],
    ["annual returns", "annual-returns", "Annual Returns"], ["contract drafting", "contract-drafting", "Contract Drafting"],
    ["contract vetting", "contract-vetting", "Contract Vetting"], ["affidavit", "affidavits", "Affidavits"],
    ["power of attorney", "power-of-attorney", "Power of Attorney"], ["legal advice", "legal-advice", "Legal Advice"],
    ["mediation", "mediation", "Mediation"], ["notary", "notary-services", "Notary Services"]
];

export default class ServiceClassifier {
    classify(input = {}) {
        const text = normalise([input.service, input.description, input.message].filter(Boolean).join(" "));
        for (const [alias, serviceId, serviceName] of SERVICE_ALIASES) if (text.includes(alias)) return { value: this.domainForService(serviceId), confidence: 0.99, matched: [alias], serviceId, serviceName, correctedInput: null };

        // Close-reference matching catches common typing errors without sending
        // an uncertain phrase into a broad department bucket.
        const words = text.split(" ").filter(word => word.length >= 3);
        const candidates = PUBLIC_SERVICE_DIRECTORY.flatMap(category => category.services.map(service => ({ ...service, category: category.category })));
        for (const word of words) {
            for (const service of candidates) {
                const tokens = service.name.toLowerCase().split(/\s+/);
                const closest = tokens.find(token => distance(word, token) <= (token.length >= 7 ? 2 : 1));
                if (closest) return { value: service.category, confidence: 0.88, matched: [service.name], serviceId: service.id, serviceName: service.name, correctedInput: { from: word, to: closest } };
            }
        }

        for (const rule of DOMAIN_RULES) {
            const matched = rule.keywords.filter(keyword => text.includes(keyword));
            if (matched.length) return { value: rule.value, confidence: matched.includes("ccma") ? 0.98 : 0.9, matched, serviceId: matched.includes("ccma") ? "ccma-representation" : null, serviceName: matched.includes("ccma") ? "CCMA Representation" : null, correctedInput: null };
        }
        return { value: "UNKNOWN", confidence: 0, matched: [], serviceId: null, serviceName: null, correctedInput: null };
    }

    domainForService(serviceId) { return PUBLIC_SERVICE_DIRECTORY.find(category => category.services.some(service => service.id === serviceId))?.category || "OTHER"; }
}
