/**
 * Isaacs & Partners — Executive PA Reminder Service
 *
 * Anthony's proactive Personal Assistant (PA) and Executive Briefing Engine
 * for the Super Admin / Director.
 *
 * Generates and dispatches proactive reminders covering:
 * - Bookings & Appointments (upcoming consultations, unassigned bookings)
 * - Quotes & Pre-Quotes (pending reviews, conversion follow-ups, pipeline values)
 * - Invoices & Payments (overdue balances, unpaid milestones)
 * - Everything else (unassigned matters, WhatsApp registration approvals, critical documents)
 */

import adminDashboardData from "../dashboard/AdminDashboardDataService.js";

const money = value => {
    const n = Number(value || 0);
    return Number.isFinite(n)
        ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(n)
        : "R0.00";
};

export class ExecutivePAReminderService {
    constructor({ dashboardService = adminDashboardData, logger = console } = {}) {
        this.dashboardService = dashboardService;
        this.logger = logger;
        this.lastBriefing = null;
    }

    /**
     * Generates a comprehensive PA reminder briefing from live or provided dashboard data.
     */
    async generateBriefing(data = null) {
        let summary = data;
        if (!summary) {
            try {
                summary = await this.dashboardService.getDashboardSummary("SUPER_ADMIN");
            } catch (err) {
                this.logger.warn("[ExecutivePAReminderService] Could not fetch live summary, using fallback", err);
                summary = { counts: {}, appointments: [], quotes: [], invoices: [], matters: [], pendingRegistrations: [] };
            }
        }

        const counts = summary.counts || {};
        const reminders = [];

        // 1. Bookings & Appointments
        const appointments = summary.appointments || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayAppointments = appointments.filter(a => String(a.starts_at || "").startsWith(today));
        const unassignedAppointments = appointments.filter(a => !a.assigned_staff_id && String(a.status || "").toUpperCase() !== "CANCELLED");

        if (todayAppointments.length > 0) {
            reminders.push({
                category: "BOOKINGS",
                severity: "HIGH",
                title: `${todayAppointments.length} Consultation(s) Scheduled for Today`,
                description: `You have ${todayAppointments.length} client consultation(s) on today's calendar.`,
                count: todayAppointments.length,
                actionUrl: "./appointments.html"
            });
        }

        if (unassignedAppointments.length > 0) {
            reminders.push({
                category: "BOOKINGS",
                severity: "MEDIUM",
                title: `${unassignedAppointments.length} Unassigned Consultation(s)`,
                description: "Consultation bookings require a designated staff member or consultant.",
                count: unassignedAppointments.length,
                actionUrl: "./appointments.html"
            });
        }

        // 2. Quotes & Pre-Quotes
        const quotes = summary.quotes || [];
        const pendingQuotes = quotes.filter(q => !["APPROVED", "ACCEPTED", "REJECTED", "DECLINED", "CANCELLED"].includes(String(q.status || "").toUpperCase()));
        const totalQuoteValue = pendingQuotes.reduce((sum, q) => sum + (Number(q.total_amount ?? q.total ?? q.amount) || 0), 0);

        if (pendingQuotes.length > 0) {
            reminders.push({
                category: "QUOTES",
                severity: "HIGH",
                title: `${pendingQuotes.length} Pending Pre-Quote(s) Awaiting Decision`,
                description: `Pipeline value of ${money(totalQuoteValue)} requires review or customer follow-up.`,
                count: pendingQuotes.length,
                amount: totalQuoteValue,
                actionUrl: "./quotes.html"
            });
        }

        // 3. Invoices & Outstanding Balances
        const invoices = summary.invoices || [];
        const outstandingInvoices = invoices.filter(i => !["PAID", "CANCELLED", "VOID"].includes(String(i.status || "").toUpperCase()));
        const outstandingBalance = counts.outstandingBalance || outstandingInvoices.reduce((sum, i) => sum + (Number(i.balance_due ?? i.amount_due ?? i.total_amount ?? i.total ?? i.amount) || 0), 0);

        if (outstandingInvoices.length > 0) {
            reminders.push({
                category: "INVOICES",
                severity: "HIGH",
                title: `${outstandingInvoices.length} Outstanding Invoice(s) (${money(outstandingBalance)})`,
                description: `Total outstanding debtor balance is ${money(outstandingBalance)}. Follow-up reminder notifications recommended.`,
                count: outstandingInvoices.length,
                amount: outstandingBalance,
                actionUrl: "./invoices.html"
            });
        }

        // 4. Everything: Pending Registrations, Unassigned Matters, Outstanding Documents
        const pendingRegs = summary.pendingRegistrations || [];
        if (pendingRegs.length > 0) {
            reminders.push({
                category: "REGISTRATIONS",
                severity: "HIGH",
                title: `${pendingRegs.length} WhatsApp Registration(s) Awaiting Approval`,
                description: "New prospective clients registered via WhatsApp are awaiting Super Admin identity verification.",
                count: pendingRegs.length,
                actionUrl: "./communications.html"
            });
        }

        const openMatters = counts.openMatters || (summary.matters || []).length;
        const unassignedMatters = counts.unassignedMatters || 0;
        if (unassignedMatters > 0) {
            reminders.push({
                category: "OPERATIONS",
                severity: "MEDIUM",
                title: `${unassignedMatters} Matter(s) Unassigned to Staff`,
                description: `Out of ${openMatters} active matter(s), ${unassignedMatters} have no designated staff owner.`,
                count: unassignedMatters,
                actionUrl: "./matters.html"
            });
        }

        const outstandingDocs = counts.outstandingDocuments || 0;
        if (outstandingDocs > 0) {
            reminders.push({
                category: "DOCUMENTS",
                severity: "LOW",
                title: `${outstandingDocs} Critical Document(s) Outstanding`,
                description: "Clients have outstanding compliance or verification documents required for active workflows.",
                count: outstandingDocs,
                actionUrl: "./document-workspace.html"
            });
        }

        // Generate Anthony's PA Briefing Text
        const briefingText = this.formatBriefingText(reminders, counts);

        this.lastBriefing = {
            generatedAt: new Date().toISOString(),
            reminders,
            briefingText,
            counts: {
                total: reminders.length,
                bookings: todayAppointments.length + unassignedAppointments.length,
                quotes: pendingQuotes.length,
                invoices: outstandingInvoices.length,
                registrations: pendingRegs.length,
                unassignedMatters
            }
        };

        return this.lastBriefing;
    }

    /**
     * Formats Anthony's executive PA narrative briefing.
     */
    formatBriefingText(reminders, counts) {
        const todayStr = new Intl.DateTimeFormat("en-ZA", { dateStyle: "full" }).format(new Date());
        let text = `Good day, Director. Here is your executive briefing from Anthony, your Personal Assistant, for ${todayStr}:\n\n`;

        if (reminders.length === 0) {
            text += "All operational departments are clear! There are no outstanding reminders for bookings, quotes, invoices, or pending registrations at this time.\n";
            return text;
        }

        text += `I have identified ${reminders.length} priority action item(s) requiring your executive attention:\n\n`;

        reminders.forEach((r, idx) => {
            const icon = {
                BOOKINGS: "📅",
                QUOTES: "📋",
                INVOICES: "💳",
                REGISTRATIONS: "📱",
                OPERATIONS: "⚖️",
                DOCUMENTS: "📄"
            }[r.category] || "🔔";

            text += `${idx + 1}. ${icon} [${r.category}] ${r.title}\n   ${r.description}\n\n`;
        });

        text += "I am actively monitoring these items and can dispatch follow-ups to clients or notify colleagues upon your instruction.";
        return text;
    }

    /**
     * Entry point for ReminderJob or automated schedulers.
     */
    async runReminders(options = {}) {
        this.logger.log("[ExecutivePAReminderService] Running executive PA reminders check...");
        const briefing = await this.generateBriefing();
        this.logger.log(`[ExecutivePAReminderService] Briefing generated: ${briefing.reminders.length} reminder(s).`);
        return briefing;
    }
}

export const executivePAReminderService = new ExecutivePAReminderService();
export default executivePAReminderService;
