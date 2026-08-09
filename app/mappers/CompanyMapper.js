/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Company Mapper
 * ============================================================
 */

export default class CompanyMapper {

    static toPersistence(company) {

        if (!company) {
            return null;
        }

        const data =
            typeof company.toJSON === "function"
                ? company.toJSON()
                : { ...company };

        return {
            ...data,
            id: company.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // CIPC information
        // SARS information
        // Company registration mapping
        // Business banking mapping
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };
    }


    static toTransport(company) {

        if (!company) {
            return null;
        }

        return {
            ...this.toPersistence(company)
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }

}
