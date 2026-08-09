/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Knowledge Mapper
 * ============================================================
 */

export default class KnowledgeMapper {

    static toPersistence(knowledge) {

        if (!knowledge) {
            return null;
        }

        const data =
            typeof knowledge.toJSON === "function"
                ? knowledge.toJSON()
                : { ...knowledge };

        return {
            ...data,
            id: knowledge.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Knowledgebase source mapping
        // Version mapping
        // Effective-date mapping
        // Legal source references
        // Visa-type mapping
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


    static toTransport(knowledge) {

        if (!knowledge) {
            return null;
        }

        return {
            ...this.toPersistence(knowledge)
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
