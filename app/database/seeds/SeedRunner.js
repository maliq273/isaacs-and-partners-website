import COMPANY_SEED from "./CompanySeed.js";
import DEFAULT_USERS from "./UserSeed.js";
import KNOWLEDGE_DOMAINS from "./KnowledgeSeed.js";

export default class SeedRunner {
    constructor(database) {
        if (!database) {
            throw new Error(
                "Database connection is required"
            );
        }

        this.database = database;
    }

    async run() {
        await this.seedCompany();
        await this.seedUsers();
        await this.seedKnowledgeDomains();

        return {
            success: true
        };
    }

    async seedCompany() {
        const sql = `
            INSERT OR IGNORE INTO companies (
                id,
                registration_number,
                tax_number,
                name,
                trading_name,
                vat_registered,
                vat_number,
                email,
                telephone,
                physical_address,
                postal_address,
                bank_name,
                account_holder,
                account_number,
                branch_code,
                account_type,
                payment_terms,
                banking_reference_format,
                legal_representative,
                legal_representative_title,
                status,
                created_at,
                updated_at
            )
            VALUES (
                :id,
                :registration_number,
                :tax_number,
                :name,
                :trading_name,
                :vat_registered,
                :vat_number,
                :email,
                :telephone,
                :physical_address,
                :postal_address,
                :bank_name,
                :account_holder,
                :account_number,
                :branch_code,
                :account_type,
                :payment_terms,
                :banking_reference_format,
                :legal_representative,
                :legal_representative_title,
                :status,
                :created_at,
                :updated_at
            )
        `;

        return this.database.execute(
            sql,
            COMPANY_SEED
        );
    }

    async seedUsers() {
        const sql = `
            INSERT OR IGNORE INTO users (
                id,
                username,
                email,
                password_hash,
                first_name,
                last_name,
                role,
                department,
                status,
                last_login,
                created_at,
                updated_at
            )
            VALUES (
                :id,
                :username,
                :email,
                :password_hash,
                :first_name,
                :last_name,
                :role,
                :department,
                :status,
                :last_login,
                :created_at,
                :updated_at
            )
        `;

        for (const user of DEFAULT_USERS) {
            await this.database.execute(
                sql,
                user
            );
        }
    }

    async seedKnowledgeDomains() {
        const sql = `
            INSERT OR IGNORE INTO knowledge (
                id,
                domain,
                category,
                title,
                content,
                source_type,
                source_name,
                source_url,
                citation,
                source_date,
                effective_date,
                version,
                jurisdiction,
                status,
                authority_level,
                tags,
                metadata,
                created_at,
                updated_at
            )
            VALUES (
                :id,
                :domain,
                :category,
                :title,
                :content,
                :source_type,
                :source_name,
                :source_url,
                :citation,
                :source_date,
                :effective_date,
                :version,
                :jurisdiction,
                :status,
                :authority_level,
                :tags,
                :metadata,
                :created_at,
                :updated_at
            )
        `;

        for (
            const knowledge
            of KNOWLEDGE_DOMAINS
        ) {
            await this.database.execute(
                sql,
                knowledge
            );
        }
    }
}
