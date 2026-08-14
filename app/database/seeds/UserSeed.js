import {
    generateId,
    nowISO
} from "../functions/DatabaseFunctions.js";

export const DEFAULT_USERS = [
    {
        id: generateId(),

        username: "admin",

        email:
            "admin@isaacsandpartners.online",

        password_hash: null,

        first_name:
            "System",

        last_name:
            "Administrator",

        role: "admin",

        department: "management",

        status: "active",

        last_login: null,

        created_at: nowISO(),

        updated_at: nowISO()
    }
];

export default DEFAULT_USERS;
