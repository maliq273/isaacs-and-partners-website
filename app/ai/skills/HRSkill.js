export default class HRSkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name = "HR";
        this.knowledgeEngine = knowledgeEngine;
    }

    supports(service) {
        return /hr|employment|employee|disciplinary|grievance|payroll|sars/i.test(
            String(service || "")
        );
    }

    payrollWorkflow(context = {}) {
        const identity = context.identity || {};
        const role = String(identity.role || identity.authorityRole || "").toUpperCase();
        const business = context.business || {};
        const internal = Boolean(business.is_internal_company);
        if (internal && ["STAFF","SUPER_ADMIN"].includes(role)) {
            return {
                mode: "INTERNAL",
                workflow: ["IMPORT","VALIDATE","CALCULATE","MONTH_OVER_MONTH_MATCH","REVIEW","SUPER_ADMIN_APPROVAL","RELEASE","PAYSLIP_PREVIEW","ARCHIVE","SARS"],
                instruction: "Do not ask who the user is. Use the authenticated colleague identity and authorised business context. Compare the current payroll against the previous payroll by employee number/employee identity. Flag new employees and every material pay change, including extreme increases such as R15,000 to R150,000. Then notify Super Admin: 'Payroll completed by: [user]. Please log in, review and approve the payroll to release it.' Do not expose payslip previews before release."
            };
        }
        if (role === "BUSINESS") {
            return {
                mode: "CLIENT",
                workflow: ["IMPORT","VALIDATE","CALCULATE","MONTH_OVER_MONTH_MATCH","REVIEW","INVOICE","PAYSTACK_VERIFY","AUTHORISED_RELEASE","PAYSLIP_PREVIEW","ARCHIVE","SARS"],
                instruction: "Recognise the logged-in client and linked company automatically. Ask for the required Excel payroll spreadsheet; never ask them to identify themselves or choose whether this is internal/client payroll. Identify the designated payroll reviewer/contact (falling back to the company owner), send that person a WhatsApp request to log in, review the reconciliation and release the payroll. Compare current versus previous payroll by employee identity/number; flag new employees, increases and extreme changes such as R15,000 to R150,000. Payment must still be verified by Paystack before release. Payslip previews become available only after release. SARS remains a separate dashboard and remains inaccessible until its module is Super-Admin-approved and its applicable retainer is paid."
            };
        }
        return {
            mode: "AUTHORISED_OPERATOR",
            workflow: ["IMPORT","VALIDATE","CALCULATE","PREVIEW","INVOICE_OR_APPROVAL","RELEASE","ARCHIVE","SARS"],
            instruction: "Use the authenticated operator's permissions and the selected business relationship. Never infer client identity from free text when the authenticated account already resolves it."
        };
    }

    async execute(context = {}) {
        const knowledge =
            await this.knowledgeEngine?.search?.({
                domain: "hr",
                service: context.service
            }) || [];

        return {
            domain: "HR",
            knowledge,
            payroll: this.payrollWorkflow(context)
        };
    }
}
