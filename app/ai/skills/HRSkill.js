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
                workflow: ["IMPORT","VALIDATE","CALCULATE","PREVIEW","SUPER_ADMIN_APPROVAL","RELEASE","ARCHIVE","SARS"],
                instruction: "Do not ask who the user is. Use the authenticated colleague identity and authorised business context. After an internal payroll is completed, notify Super Admin: 'Payroll completed by: [user]. Please log in and approve.' Do not release before approval."
            };
        }
        if (role === "BUSINESS") {
            return {
                mode: "CLIENT",
                workflow: ["IMPORT","VALIDATE","CALCULATE","PREVIEW","INVOICE","PAYSTACK_VERIFY","RELEASE","ARCHIVE","SARS"],
                instruction: "Recognise the logged-in client and linked company automatically. Ask the client to provide the required Excel payroll spreadsheet; never ask them to identify themselves or choose whether this is internal/client payroll. Show payslip previews, keep payslips locked until backend Paystack verification, and keep SARS data populated but client access locked until the monthly SARS retainer is verified paid."
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
