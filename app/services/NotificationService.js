/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * NotificationService
 * ============================================================
 *
 * LOCATION
 * app/services/NotificationService.js
 * ============================================================
 */

export default class NotificationService {

    constructor({
        emailProvider = null,
        whatsappProvider = null,
        smsProvider = null,
        logger = null
    } = {}) {

        this.emailProvider =
            emailProvider;

        this.whatsappProvider =
            whatsappProvider;

        this.smsProvider =
            smsProvider;

        this.logger =
            logger;

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * WhatsApp Business API
         * Email provider
         * SMS provider
         * Push notifications
         * ====================================================
         */
    }

    async sendEmail({
        to,
        subject,
        body,
        attachments = []
    } = {}) {

        if (!to) {
            throw new Error(
                "Recipient email is required."
            );
        }

        if (
            this.emailProvider &&
            typeof this.emailProvider.send ===
            "function"
        ) {
            return this.emailProvider.send({
                to,
                subject,
                body,
                attachments
            });
        }

        return {
            channel: "email",
            status: "QUEUED",
            to
        };
    }

    async sendWhatsApp({
        phone,
        message
    } = {}) {

        if (!phone) {
            throw new Error(
                "WhatsApp number is required."
            );
        }

        if (
            this.whatsappProvider &&
            typeof this.whatsappProvider.send ===
            "function"
        ) {
            return this.whatsappProvider.send({
                phone,
                message
            });
        }

        return {
            channel: "whatsapp",
            status: "QUEUED",
            phone
        };
    }

    async sendSMS({
        phone,
        message
    } = {}) {

        if (
            this.smsProvider &&
            typeof this.smsProvider.send ===
            "function"
        ) {
            return this.smsProvider.send({
                phone,
                message
            });
        }

        return {
            channel: "sms",
            status: "QUEUED",
            phone
        };
    }

    async sendToClient({
        client,
        channel = "whatsapp",
        message,
        subject = null
    } = {}) {

        if (!client) {
            throw new Error(
                "Client is required."
            );
        }

        if (
            channel === "whatsapp"
        ) {
            return this.sendWhatsApp({
                phone:
                    client.whatsapp ||
                    client.phone,
                message
            });
        }

        if (
            channel === "email"
        ) {
            return this.sendEmail({
                to: client.email,
                subject:
                    subject ||
                    "Isaacs & Partners",
                body: message
            });
        }

        if (
            channel === "sms"
        ) {
            return this.sendSMS({
                phone:
                    client.phone,
                message
            });
        }

        throw new Error(
            `Unsupported notification channel: ${channel}`
        );
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Notification templates
     * Matter notifications
     * Appointment reminders
     * Outstanding document reminders
     * VFS updates
     * DHA updates
     * Bundle-ready notifications
     * Monday applicant updates
     * Staff notifications
     * Escalations
     * ========================================================
     */

}
