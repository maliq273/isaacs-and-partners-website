/*
 * Isaacs & Partners public AI service navigation.
 *
 * This is a browser-safe navigation index derived from app/data/services.json.
 * It gives the public liaison an explicit four-category decision tree before
 * free-form AI reasoning. The operational catalogue remains app/data/services.json.
 */

export const PUBLIC_SERVICE_DIRECTORY = Object.freeze([
    {
        id: "immigration",
        category: "IMMIGRATION",
        name: "Immigration Services",
        services: [
            ["work-visas", "Work Visas"], ["critical-skills-visas", "Critical Skills Visas"],
            ["general-work-visas", "General Work Visas"], ["business-visas", "Business Visas"],
            ["corporate-visas", "Corporate Visas"], ["study-visas", "Study Visas"],
            ["relative-visas", "Relative Visas"], ["spousal-visas", "Spousal Visas"],
            ["visitor-visas", "Visitor Visas"], ["permanent-residence", "Permanent Residence"],
            ["citizenship-applications", "Citizenship Applications"], ["refugee-asylum-assistance", "Refugee & Asylum Assistance"],
            ["section-22-applications", "Section 22 Applications"], ["section-24-applications", "Section 24 Applications"],
            ["visa-appeals", "Visa Appeals"], ["dha-representations", "DHA Representations"],
            ["vfs-global-applications", "VFS Global Applications"], ["status-verification", "Status Verification"]
        ].map(([id, name]) => ({ id, name }))
    },
    {
        id: "hr-industrial-relations",
        category: "HR_IR",
        name: "HR & Industrial Relations",
        services: [
            ["employment-contracts", "Employment Contracts"], ["hr-policies", "HR Policies"],
            ["disciplinary-hearings", "Disciplinary Hearings"], ["chairperson-services", "Chairperson Services"],
            ["grievance-hearings", "Grievance Hearings"], ["performance-management", "Performance Management"],
            ["retrenchment-consulting", "Retrenchment Consulting"], ["ccma-representation", "CCMA Representation"],
            ["bargaining-council-matters", "Bargaining Council Matters"], ["payroll-advisory", "Payroll Advisory"],
            ["labour-compliance-audits", "Labour Compliance Audits"], ["employment-equity", "Employment Equity"],
            ["recruitment-assistance", "Recruitment Assistance"], ["hr-outsourcing", "HR Outsourcing"]
        ].map(([id, name]) => ({ id, name }))
    },
    {
        id: "business-compliance",
        category: "BUSINESS_COMPLIANCE",
        name: "Business Compliance",
        services: [
            ["company-registration", "Company Registration"], ["cipc-amendments", "CIPC Amendments"],
            ["business-name-reservations", "Business Name Reservations"], ["sars-registration", "SARS Registration"],
            ["vat-registration", "VAT Registration"], ["paye-registration", "PAYE Registration"],
            ["uif-registration", "UIF Registration"], ["coida-registration", "COIDA Registration"],
            ["tax-clearance", "Tax Clearance"], ["business-bank-account", "Business Bank Account Setup"],
            ["compliance-certificates", "Compliance Certificates"], ["annual-returns", "Annual Returns"],
            ["director-amendments", "Director Amendments"], ["business-consulting", "Business Consulting"]
        ].map(([id, name]) => ({ id, name }))
    },
    {
        id: "legal",
        category: "LEGAL",
        name: "Legal Services",
        services: [
            ["legal-advice", "Legal Advice"], ["contract-drafting", "Contract Drafting"],
            ["contract-vetting", "Contract Vetting"], ["commercial-agreements", "Commercial Agreements"],
            ["settlement-agreements", "Settlement Agreements"], ["power-of-attorney", "Power of Attorney"],
            ["affidavits", "Affidavits"], ["appeal-drafting", "Appeal Drafting"],
            ["mediation", "Mediation"], ["negotiations", "Negotiations"],
            ["notary-services", "Notary Services"], ["legal-opinions", "Legal Opinions"],
            ["corporate-advisory", "Corporate Advisory"]
        ].map(([id, name]) => ({ id, name }))
    }
]);

export function getPublicService(id) {
    const key = String(id || "").trim().toLowerCase();
    for (const category of PUBLIC_SERVICE_DIRECTORY) {
        const service = category.services.find((item) => item.id === key);
        if (service) return { ...service, category: category.category, categoryName: category.name };
    }
    return null;
}

export function getPublicCategories() {
    return PUBLIC_SERVICE_DIRECTORY.map(({ id, category, name }) => ({ id, category, name }));
}

export function searchPublicServices(query, limit = 6) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
    const results = [];

    for (const category of PUBLIC_SERVICE_DIRECTORY) {
        for (const service of category.services) {
            const haystack = `${service.id} ${service.name} ${category.name}`.toLowerCase();
            let score = haystack.includes(q) ? 10 : 0;
            for (const token of tokens) if (haystack.includes(token)) score += 2;
            if (score) results.push({ ...service, category: category.category, categoryName: category.name, score });
        }
    }

    return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}

export default PUBLIC_SERVICE_DIRECTORY;
