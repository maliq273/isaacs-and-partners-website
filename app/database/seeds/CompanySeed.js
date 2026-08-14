import {
    generateId,
    nowISO
} from "../functions/DatabaseFunctions.js";

export const COMPANY_SEED = {
    id: generateId(),

    registration_number:
        "2025/474736/07",

    tax_number:
        "9293784261",

    name:
        "Isaacs and Partners Pty(Ltd)",

    trading_name:
        "Isaacs and Partners",

    vat_registered: 0,

    vat_number: null,

    email:
        "info@isaacsandpartners.online",

    telephone:
        "+2771 883 1097",

    physical_address:
        "13 Middel Street, Kempenville, Cape Town, 7530",

    postal_address:
        "Unit 215, River Hamlet, 52 Gie Rd, Milnerton Rural, 7441",

    bank_name:
        "First Nation Bank",

    account_holder:
        "Isaacs and Partners",

    account_number:
        "63211314454",

    branch_code:
        "255355",

    account_type:
        "Business Account",

    payment_terms:
        "On receipt",

    banking_reference_format:
        "initials - querie - invoice number",

    legal_representative:
        "Isaacs and Partners",

    legal_representative_title:
        "Isaacs and Partners",

    status: "active",

    created_at: nowISO(),

    updated_at: nowISO()
};

export default COMPANY_SEED;
