/**
 * ============================================================
 * KNOWLEDGE ENGINE
 * ============================================================
 */

import KnowledgeLoader from "./KnowledgeLoader.js";
import KnowledgeSearch from "./KnowledgeSearch.js";
import RuleEngine from "./RuleEngine.js";
import RequirementEngine from "./RequirementEngine.js";
import DocumentEngine from "./DocumentEngine.js";

export default class KnowledgeEngine {

    constructor() {

        this.data = KnowledgeLoader.load();

    }

    search(query){

        return KnowledgeSearch.search(

            this.data,

            query

        );

    }

    getRequirements(service){

        return RequirementEngine.get(

            this.data,

            service

        );

    }

    getRules(service){

        return RuleEngine.get(

            this.data,

            service

        );

    }

    getDocuments(service){

        return DocumentEngine.get(

            this.data,

            service

        );

    }

}
