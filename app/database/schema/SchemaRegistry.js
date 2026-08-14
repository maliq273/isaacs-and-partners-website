/**
 * Central schema registry.
 *
 * Keeps the JavaScript database layer aware of the authoritative
 * schema files without duplicating SQL inside repositories.
 */

const schemas = Object.freeze({
    users: {
        file: "User.sql",
        primaryKey: "id"
    },

    companies: {
        file: "Company.sql",
        primaryKey: "id"
    },

    clients: {
        file: "Client.sql",
        primaryKey: "id"
    },

    matters: {
        file: "Matter.sql",
        primaryKey: "id"
    },

    appointments: {
        file: "Appointment.sql",
        primaryKey: "id"
    },

    documents: {
        file: "Document.sql",
        primaryKey: "id"
    },

    invoices: {
        file: "Invoice.sql",
        primaryKey: "id"
    },

    payments: {
        file: "Payment.sql",
        primaryKey: "id"
    },

    tasks: {
        file: "Task.sql",
        primaryKey: "id"
    },

    workflows: {
        file: "Workflow.sql",
        primaryKey: "id"
    },

    knowledge: {
        file: "Knowledge.sql",
        primaryKey: "id"
    }
});

export function getSchema(tableName) {
    return schemas[tableName] || null;
}

export function hasSchema(tableName) {
    return Boolean(schemas[tableName]);
}

export function getSchemaTables() {
    return Object.keys(schemas);
}

export default schemas;
