import UsersTable from "./UsersTable.js";
import CompaniesTable from "./CompaniesTable.js";
import ClientsTable from "./ClientsTable.js";
import MattersTable from "./MattersTable.js";
import AppointmentsTable from "./AppointmentsTable.js";
import DocumentsTable from "./DocumentsTable.js";
import InvoicesTable from "./InvoicesTable.js";
import PaymentsTable from "./PaymentsTable.js";
import TasksTable from "./TasksTable.js";
import WorkflowsTable from "./WorkflowsTable.js";
import KnowledgeTable from "./KnowledgeTable.js";

const registry = Object.freeze({
    users: UsersTable,
    companies: CompaniesTable,
    clients: ClientsTable,
    matters: MattersTable,
    appointments: AppointmentsTable,
    documents: DocumentsTable,
    invoices: InvoicesTable,
    payments: PaymentsTable,
    tasks: TasksTable,
    workflows: WorkflowsTable,
    knowledge: KnowledgeTable
});

export function getTable(name) {
    return registry[name] || null;
}

export function hasTable(name) {
    return Boolean(registry[name]);
}

export function getTableNames() {
    return Object.keys(registry);
}

export default registry;
