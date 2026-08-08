/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * NotificationService.js
 *
 * FILE ID
 * SER-011
 *
 * LOCATION
 * app/services/NotificationService.js
 *
 * LAYER
 * Application / Service
 *
 * RESPONSIBILITY
 * Central notification orchestration service.
 *
 * ============================================================
 *
 * NOTIFICATION FLOW
 *
 * Matter / Workflow / Appointment / Document / AI
 *                     ↓
 *              NotificationService
 *                     ↓
 *              Channel Resolver
 *                     ↓
 *       ┌─────────────┼──────────────┐
 *       ↓             ↓              ↓
 *     Email        WhatsApp        In-App
 *       ↓             ↓              ↓
 *                 SMS / Future Channels
 *
 * ============================================================
 *
 * IMPORTANT
 *
 * This service determines WHAT should be sent and through
 * WHICH channel.
 *
 * Actual provider integrations should remain behind provider
 * adapters.
 *
 * ============================================================
 */


/*=============================================================
    NOTIFICATION SERVICE
=============================================================*/

export default class NotificationService {


    /*=========================================================
        SER-NOT-001
        Constructor
    =========================================================*/

    constructor({

        providers = {},

        storage = null,

        logger = null,

        state = null,

        settings = null

    } = {}) {


        this.providers =
            providers || {};


        this.storage =
            storage;


        this.logger =
            logger;


        this.state =
            state;


        this.settings =
            settings;


        /*
         *=====================================================
         * SUPPORTED CHANNELS
         *=====================================================
         */

        this.channels = new Map();


        this.registerDefaultChannels();


        /*
         *=====================================================
         * NOTIFICATION HISTORY
         *=====================================================
         */

        this.history = [];


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * PERSISTENT NOTIFICATION REPOSITORY
         *
         * Future production repository:
         *
         * NotificationRepository
         *
         * It should store:
         *
         * notification ID
         * matter ID
         * client ID
         * recipient
         * channel
         * event
         * template
         * status
         * provider response
         * timestamps
         * delivery result
         * failure reason
         *=====================================================
         */


        /*
         *=====================================================
         * NOTIFICATION TEMPLATES
         *=====================================================
         */

        this.templates = new Map();


        this.registerDefaultTemplates();

    }


    /*=========================================================
        SER-NOT-002
        Register Default Channels
    =========================================================*/

    registerDefaultChannels() {


        this.channels.set(
            "email",
            this.providers.email || null
        );


        this.channels.set(
            "whatsapp",
            this.providers.whatsapp || null
        );


        this.channels.set(
            "sms",
            this.providers.sms || null
        );


        this.channels.set(
            "in-app",
            this.providers.inApp || null
        );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * ADDITIONAL CHANNELS
         *
         * portal
         * push
         * Teams
         * Slack
         *=====================================================
         */

    }


    /*=========================================================
        SER-NOT-003
        Register Channel
    =========================================================*/

    registerChannel(
        name,
        provider
    ) {


        if (!name) {

            throw new Error(
                "Notification channel name is required."
            );

        }


        const key =
            String(
                name
            )
                .trim()
                .toLowerCase();


        this.channels.set(
            key,
            provider
        );


        return this;

    }


    /*=========================================================
        SER-NOT-004
        Get Channel
    =========================================================*/

    getChannel(
        name
    ) {


        if (!name) {

            return null;

        }


        return this.channels.get(
            String(
                name
            )
                .trim()
                .toLowerCase()
        ) || null;

    }


    /*=========================================================
        SER-NOT-005
        Register Template
    =========================================================*/

    registerTemplate(
        name,
        template
    ) {


        if (!name) {

            throw new Error(
                "Notification template name is required."
            );

        }


        if (
            typeof template !==
            "function" &&
            typeof template !==
            "string"
        ) {

            throw new Error(
                "Notification template must be a string or function."
            );

        }


        this.templates.set(
            name,
            template
        );


        return this;

    }


    /*=========================================================
        SER-NOT-006
        Register Default Templates
    =========================================================*/

    registerDefaultTemplates() {


        this.registerTemplate(
            "matter.created",
            data =>
                `Your matter ${data.referenceNumber || ""} has been created.`
        );


        this.registerTemplate(
            "matter.updated",
            data =>
                `Your matter ${data.referenceNumber || ""} has been updated.`
        );


        this.registerTemplate(
            "document.required",
            data =>
                `A document is required for matter ${data.referenceNumber || ""}.`
        );


        this.registerTemplate(
            "document.approved",
            data =>
                `A document for matter ${data.referenceNumber || ""} has been approved.`
        );


        this.registerTemplate(
            "document.rejected",
            data =>
                `A document for matter ${data.referenceNumber || ""} requires attention.`
        );


        this.registerTemplate(
            "appointment.created",
            data =>
                `Your appointment has been scheduled${data.date ? ` for ${data.date}` : ""}.`
        );


        this.registerTemplate(
            "appointment.reminder",
            data =>
                `Reminder: your appointment is approaching${data.date ? ` on ${data.date}` : ""}.`
        );


        this.registerTemplate(
            "workflow.updated",
            data =>
                `Your matter workflow has been updated.`
        );


        this.registerTemplate(
            "workflow.completed",
            data =>
                `The workflow for your matter has been completed.`
        );


        this.registerTemplate(
            "task.assigned",
            data =>
                `A new task has been assigned to you.`
        );


        this.registerTemplate(
            "system.alert",
            data =>
                data.message ||
                "A system alert requires your attention."
        );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * IMMIGRATION-SPECIFIC TEMPLATES
         *
         * VFS appointment
         * DHA submission
         * visa outcome
         * appeal outcome
         * document expiry
         * passport expiry
         * permit expiry
         * outstanding documents
         * bundle ready for printing
         *=====================================================
         */

    }


    /*=========================================================
        SER-NOT-007
        Build Notification
    =========================================================*/

    buildNotification({

        event,

        recipient,

        channel = "in-app",

        subject = null,

        message = null,

        template = null,

        data = {},

        priority = "NORMAL",

        metadata = {}

    } = {}) {


        if (!event) {

            throw new Error(
                "Notification event is required."
            );

        }


        const generatedMessage =
            message ||
            this.renderTemplate(
                template || event,
                data
            );


        return {

            id:
                this.generateNotificationId(),

            event,

            recipient,

            channel,

            subject,

            message:
                generatedMessage,

            data,

            priority,

            metadata,

            status:
                "PENDING",

            createdAt:
                new Date(),

            sentAt:
                null,

            deliveredAt:
                null,

            failureReason:
                null

        };

    }


    /*=========================================================
        SER-NOT-008
        Generate Notification ID
    =========================================================*/

    generateNotificationId() {


        return (
            `NOT-${Date.now()}-` +
            Math.random()
                .toString(36)
                .slice(2, 10)
        );

    }


    /*=========================================================
        SER-NOT-009
        Render Template
    =========================================================*/

    renderTemplate(
        templateName,
        data = {}
    ) {


        const template =
            this.templates.get(
                templateName
            );


        if (!template) {

            return (
                data.message ||
                ""
            );

        }


        if (
            typeof template ===
            "function"
        ) {

            return template(
                data
            );

        }


        return template.replace(
            /\{\{(.*?)\}\}/g,
            (
                match,
                key
            ) => {

                const value =
                    key
                        .trim()
                        .split(".")
                        .reduce(
                            (
                                current,
                                property
                            ) =>
                                current?.[property],
                            data
                        );


                return (
                    value ??
                    ""
                );

            }
        );

    }


    /*=========================================================
        SER-NOT-010
        Send Notification
    =========================================================*/

    async send(
        notification
    ) {


        if (!notification) {

            throw new Error(
                "Notification is required."
            );

        }


        const channel =
            this.getChannel(
                notification.channel
            );


        if (!channel) {

            notification.status =
                "QUEUED";


            await this.persistNotification(
                notification
            );


            /*
             *=================================================
             * FUTURE INSERT
             *
             * QUEUE SYSTEM
             *
             * Notifications without a live provider should
             * enter a persistent queue.
             *
             *=================================================
             */


            return notification;

        }


        try {


            let result;


            if (
                typeof channel.send ===
                "function"
            ) {

                result =
                    await channel.send(
                        notification
                    );

            } else if (
                typeof channel.notify ===
                "function"
            ) {

                result =
                    await channel.notify(
                        notification
                    );

            } else {

                throw new Error(
                    `Notification provider for ${notification.channel} has no send method.`
                );

            }


            notification.status =
                "SENT";


            notification.sentAt =
                new Date();


            notification.providerResponse =
                result;


            await this.persistNotification(
                notification
            );


            return notification;


        } catch (error) {


            notification.status =
                "FAILED";


            notification.failureReason =
                error.message;


            await this.persistNotification(
                notification
            );


            await this.logError(
                error,
                notification
            );


            throw error;

        }

    }


    /*=========================================================
        SER-NOT-011
        Send By Event
    =========================================================*/

    async sendEvent({

        event,

        recipient,

        channel = "in-app",

        subject = null,

        data = {},

        priority = "NORMAL",

        metadata = {}

    } = {}) {


        const notification =
            this.buildNotification({

                event,

                recipient,

                channel,

                subject,

                template:
                    event,

                data,

                priority,

                metadata

            });


        return this.send(
            notification
        );

    }


    /*=========================================================
        SER-NOT-012
        Send To Client
    =========================================================*/

    async sendToClient({

        client,

        event,

        channel = "in-app",

        subject = null,

        data = {},

        priority = "NORMAL"

    } = {}) {


        if (!client) {

            throw new Error(
                "Client is required."
            );

        }


        const recipient =
            this.resolveClientRecipient(
                client,
                channel
            );


        if (!recipient) {

            throw new Error(
                `No ${channel} recipient available for client.`
            );

        }


        return this.sendEvent({

            event,

            recipient,

            channel,

            subject,

            data: {

                ...data,

                clientId:
                    client.id

            },

            priority

        });

    }


    /*=========================================================
        SER-NOT-013
        Resolve Client Recipient
    =========================================================*/

    resolveClientRecipient(
        client,
        channel
    ) {


        switch (
            String(
                channel
            )
                .toLowerCase()
        ) {


            case "email":

                return (
                    client.email ||
                    client.contactEmail ||
                    null
                );


            case "whatsapp":

                return (
                    client.whatsapp ||
                    client.phone ||
                    client.mobile ||
                    null
                );


            case "sms":

                return (
                    client.phone ||
                    client.mobile ||
                    null
                );


            case "in-app":

                return (
                    client.id ||
                    null
                );


            default:

                return (
                    client.id ||
                    null
                );

        }

    }


    /*=========================================================
        SER-NOT-014
        Send To Staff
    =========================================================*/

    async sendToStaff({

        user,

        event,

        channel = "in-app",

        subject = null,

        data = {},

        priority = "NORMAL"

    } = {}) {


        if (!user) {

            throw new Error(
                "Staff user is required."
            );

        }


        const recipient =
            this.resolveStaffRecipient(
                user,
                channel
            );


        if (!recipient) {

            throw new Error(
                `No ${channel} recipient available for staff user.`
            );

        }


        return this.sendEvent({

            event,

            recipient,

            channel,

            subject,

            data: {

                ...data,

                userId:
                    user.id

            },

            priority

        });

    }


    /*=========================================================
        SER-NOT-015
        Resolve Staff Recipient
    =========================================================*/

    resolveStaffRecipient(
        user,
        channel
    ) {


        switch (
            String(
                channel
            )
                .toLowerCase()
        ) {


            case "email":

                return (
                    user.email ||
                    null
                );


            case "whatsapp":

                return (
                    user.whatsapp ||
                    user.phone ||
                    user.mobile ||
                    null
                );


            case "sms":

                return (
                    user.phone ||
                    user.mobile ||
                    null
                );


            case "in-app":

                return (
                    user.id ||
                    null
                );


            default:

                return (
                    user.id ||
                    null
                );

        }

    }


    /*=========================================================
        SER-NOT-016
        Notify Matter
    =========================================================*/

    async notifyMatter({

        matter,

        event,

        channel = "in-app",

        subject = null,

        data = {},

        priority = "NORMAL"

    } = {}) {


        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * MATTER → CLIENT RESOLUTION
         *
         * The service should eventually resolve:
         *
         * matter.clientId
         * ↓
         * ClientRepository
         * ↓
         * Client
         * ↓
         * preferred notification channel
         *=====================================================
         */


        return this.sendEvent({

            event,

            recipient:
                matter.clientId,

            channel,

            subject,

            data: {

                ...data,

                matterId:
                    matter.id,

                referenceNumber:
                    matter.referenceNumber,

                matterTitle:
                    matter.title

            },

            priority

        });

    }


    /*=========================================================
        SER-NOT-017
        Document Notification
    =========================================================*/

    async notifyDocument({

        matter,

        document,

        event = "document.required",

        channel = "in-app",

        data = {}

    } = {}) {


        return this.notifyMatter({

            matter,

            event,

            channel,

            data: {

                ...data,

                documentId:
                    document?.id,

                documentName:
                    document?.name

            }

        });

    }


    /*=========================================================
        SER-NOT-018
        Appointment Notification
    =========================================================*/

    async notifyAppointment({

        client,

        appointment,

        event = "appointment.created",

        channel = "in-app",

        data = {}

    } = {}) {


        return this.sendToClient({

            client,

            event,

            channel,

            data: {

                ...data,

                appointmentId:
                    appointment?.id,

                date:
                    appointment?.date,

                time:
                    appointment?.time

            }

        });

    }


    /*=========================================================
        SER-NOT-019
        Workflow Notification
    =========================================================*/

    async notifyWorkflow({

        matter,

        event = "workflow.updated",

        channel = "in-app",

        data = {},

        priority = "NORMAL"

    } = {}) {


        return this.notifyMatter({

            matter,

            event,

            channel,

            data,

            priority

        });

    }


    /*=========================================================
        SER-NOT-020
        Broadcast
    =========================================================*/

    async broadcast({

        recipients = [],

        event,

        channel = "in-app",

        subject = null,

        data = {},

        priority = "NORMAL"

    } = {}) {


        if (
            !Array.isArray(
                recipients
            )
        ) {

            throw new Error(
                "Recipients must be an array."
            );

        }


        const results = [];


        for (
            const recipient
            of recipients
        ) {


            const notification =
                this.buildNotification({

                    event,

                    recipient,

                    channel,

                    subject,

                    template:
                        event,

                    data,

                    priority

                });


            try {

                const result =
                    await this.send(
                        notification
                    );


                results.push(
                    result
                );


            } catch (error) {

                results.push({

                    notification,

                    error:
                        error.message

                });

            }

        }


        return results;

    }


    /*=========================================================
        SER-NOT-021
        Queue Notification
    =========================================================*/

    async queue(
        notification
    ) {


        if (!notification) {

            throw new Error(
                "Notification is required."
            );

        }


        notification.status =
            "QUEUED";


        await this.persistNotification(
            notification
        );


        return notification;

    }


    /*=========================================================
        SER-NOT-022
        Retry Notification
    =========================================================*/

    async retry(
        notification
    ) {


        if (!notification) {

            throw new Error(
                "Notification is required."
            );

        }


        notification.status =
            "PENDING";


        notification.failureReason =
            null;


        return this.send(
            notification
        );

    }


    /*=========================================================
        SER-NOT-023
        Persist Notification
    =========================================================*/

    async persistNotification(
        notification
    ) {


        this.history.push(
            notification
        );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * NotificationRepository.save()
         *=====================================================
         */


        if (
            this.storage &&
            typeof this.storage.saveNotification ===
            "function"
        ) {

            return this.storage.saveNotification(
                notification
            );

        }


        return notification;

    }


    /*=========================================================
        SER-NOT-024
        Get Notification History
    =========================================================*/

    async getHistory(
        filters = {}
    ) {


        let records =
            [...this.history];


        if (
            filters.recipient
        ) {

            records =
                records.filter(
                    notification =>
                        notification.recipient ===
                        filters.recipient
                );

        }


        if (
            filters.channel
        ) {

            records =
                records.filter(
                    notification =>
                        notification.channel ===
                        filters.channel
                );

        }


        if (
            filters.status
        ) {

            records =
                records.filter(
                    notification =>
                        notification.status ===
                        filters.status
                );

        }


        if (
            filters.event
        ) {

            records =
                records.filter(
                    notification =>
                        notification.event ===
                        filters.event
                );

        }


        return records;

    }


    /*=========================================================
        SER-NOT-025
        Mark Delivered
    =========================================================*/

    async markDelivered(
        notificationId
    ) {


        const notification =
            this.history.find(
                item =>
                    item.id ===
                    notificationId
            );


        if (!notification) {

            return null;

        }


        notification.status =
            "DELIVERED";


        notification.deliveredAt =
            new Date();


        await this.persistNotification(
            notification
        );


        return notification;

    }


    /*=========================================================
        SER-NOT-026
        Cancel Notification
    =========================================================*/

    async cancel(
        notificationId
    ) {


        const notification =
            this.history.find(
                item =>
                    item.id ===
                    notificationId
            );


        if (!notification) {

            return null;

        }


        notification.status =
            "CANCELLED";


        notification.cancelledAt =
            new Date();


        await this.persistNotification(
            notification
        );


        return notification;

    }


    /*=========================================================
        SER-NOT-027
        Log Error
    =========================================================*/

    async logError(
        error,
        notification = null
    ) {


        if (
            this.logger &&
            typeof this.logger.error ===
            "function"
        ) {

            this.logger.error(
                "Notification delivery failed.",
                {

                    error:
                        error?.message,

                    notificationId:
                        notification?.id,

                    channel:
                        notification?.channel,

                    event:
                        notification?.event

                }
            );

        }

    }


    /*=========================================================
        SER-NOT-028
        Notification Health Check
    =========================================================*/

    async healthCheck() {


        const channels = {};


        for (
            const [
                name,
                provider
            ]
            of this.channels.entries()
        ) {

            channels[name] =
                Boolean(
                    provider
                );

        }


        return {

            service:
                "NotificationService",

            healthy:
                true,

            channels,

            templates:
                this.templates.size,

            history:
                this.history.length,

            timestamp:
                new Date()

        };

    }


    /*=========================================================
        SER-NOT-029
        FUTURE MASTER NOTIFICATION ENGINE
    =========================================================*/

    /*
     * ========================================================
     * FUTURE INSERT MAP
     * ========================================================
     *
     * CHANNELS
     * --------------------------------------------------------
     *
     * registerChannel()
     * getChannel()
     * removeChannel()
     *
     *
     * TEMPLATES
     * --------------------------------------------------------
     *
     * registerTemplate()
     * renderTemplate()
     * versionTemplate()
     *
     *
     * DELIVERY
     * --------------------------------------------------------
     *
     * send()
     * queue()
     * retry()
     * cancel()
     *
     *
     * CLIENT
     * --------------------------------------------------------
     *
     * sendToClient()
     * notifyMatter()
     * notifyDocument()
     * notifyAppointment()
     *
     *
     * STAFF
     * --------------------------------------------------------
     *
     * sendToStaff()
     * broadcast()
     *
     *
     * WORKFLOW
     * --------------------------------------------------------
     *
     * notifyWorkflow()
     * notifyWorkflowStep()
     * notifyWorkflowFailure()
     *
     *
     * IMMIGRATION
     * --------------------------------------------------------
     *
     * notifyOutstandingDocuments()
     * notifyBundleReady()
     * notifyVFSAppointment()
     * notifyDHASubmission()
     * notifyVisaOutcome()
     * notifyPermitExpiry()
     * notifyPassportExpiry()
     *
     *
     * DELIVERY TRACKING
     * --------------------------------------------------------
     *
     * markDelivered()
     * markRead()
     * markFailed()
     * getDeliveryStatus()
     *
     *
     * SCHEDULING
     * --------------------------------------------------------
     *
     * schedule()
     * cancelScheduled()
     * processScheduled()
     *
     *
     * QUEUE
     * --------------------------------------------------------
     *
     * processQueue()
     * retryFailed()
     * deadLetterQueue()
     *
     *
     * PREFERENCES
     * --------------------------------------------------------
     *
     * getUserPreferences()
     * updateUserPreferences()
     * resolvePreferredChannel()
     *
     *
     * AUDIT
     * --------------------------------------------------------
     *
     * getHistory()
     * getDeliveryHistory()
     * getFailureHistory()
     *
     *
     * ========================================================
     */

}
