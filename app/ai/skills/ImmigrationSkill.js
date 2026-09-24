import ImmigrationInterviewEngine from "../../immigration/ImmigrationInterviewEngine.js";
import ImmigrationBundlePlanner from "../../immigration/ImmigrationBundlePlanner.js";
import {listImmigrationTemplates,getTemplateForCase} from "../../immigration/ImmigrationDocumentRegistry.js";

export default class ImmigrationSkill {
    constructor({
        knowledgeEngine = null,
        requirementEngine = null,
        documentEngine = null
    } = {}) {
        this.name = "IMMIGRATION";
        this.knowledgeEngine = knowledgeEngine;
        this.requirementEngine = requirementEngine;
        this.documentEngine = documentEngine;
        this.bundlePlanner = new ImmigrationBundlePlanner();
    }

    supports(service) {
        return String(service || "").toLowerCase().includes("immigration");
    }

    async execute(context = {}) {
        const caseType = context.caseType || context.service || context.intent || "temporary_residence";
        const interview = new ImmigrationInterviewEngine({
            caseType,
            answers: context.answers || {},
            evidence: context.evidence || []
        });

        const knowledge = await this.knowledgeEngine?.search?.({
            domain: "immigration",
            service: context.service,
            caseType
        });

        const requirements = await this.requirementEngine?.getRequirements?.({
            ...context,
            caseType
        });

        const bundlePlan = this.bundlePlanner.plan({
            caseType: interview.caseType,
            answers: interview.answers,
            documents: context.documents || []
        });

        return {
            domain: "IMMIGRATION",
            knowledge: knowledge || [],
            requirements: requirements || [],
            interview: interview.buildQuestionPlan(),
            templates: listImmigrationTemplates(),
            primaryTemplate: getTemplateForCase(interview.caseType),
            bundlePlan,
            requiresHumanReview: true,
            generationRules: {
                neverInventMaterialFacts: true,
                askBeforeGeneration: true,
                preserveOriginalGovernmentTemplate: true,
                flattenedPdfRequiresExplicitFieldMap: true,
                superAdminApprovalRequiredBeforeSubmission: true
            }
        };
    }
}
