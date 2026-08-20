/**
 * Isaacs and Partners
 * AI Analysis Engine
 *
 * Central orchestration layer for AI analysis modules.
 *
 * Responsibilities:
 * - Coordinate individual analysis modules
 * - Execute analysis pipelines
 * - Normalise analysis input
 * - Maintain analysis execution context
 * - Aggregate analysis results
 * - Track execution status
 * - Publish AI analysis events
 * - Synchronise runtime analysis state where available
 * - Support individual analysis execution
 * - Support full matter/case analysis
 *
 * IMPORTANT ARCHITECTURE RULE:
 *
 * AnalysisEngine is an ORCHESTRATOR.
 *
 * It does NOT:
 * - authenticate users
 * - manage routing
 * - own application persistence
 * - directly implement individual analysis rules
 * - replace the knowledgebase
 * - replace AIEngine
 * - replace AIOrchestrator
 * - replace the individual analysis classes
 *
 * Individual analysis classes remain responsible for their
 * specific analysis domain.
 *
 * AnalysisEngine coordinates them.
 *
 * Dependency direction:
 *
 * AnalysisEngine
 *      |
 *      +--> Analysis Modules
 *      |
 *      +--> EventBus
 *      |
 *      +--> StateStore
 *
 * It intentionally avoids importing AuthService, Router,
 * Storage, Database, or other competing application owners.
 */

import { eventBus } from "../core/events.js";
import { state } from "../core/state.js";

import CaseAnalysis from "./analysis/CaseAnalysis.js";
import CompletenessAnalysis from "./analysis/CompletenessAnalysis.js";
import ComplianceAnalysis from "./analysis/ComplianceAnalysis.js";
import DocumentAnalysis from "./analysis/DocumentAnalysis.js";
import EligibilityAnalysis from "./analysis/EligibilityAnalysis.js";
import ImageAnalysis from "./analysis/ImageAnalysis.js";
import OCRAnalysis from "./analysis/OCRAnalysis.js";
import QualityAnalysis from "./analysis/QualityAnalysis.js";
import RecommendationAnalysis from "./analysis/RecommendationAnalysis.js";
import RiskAnalysis from "./analysis/RiskAnalysis.js";
import SummaryAnalysis from "./analysis/SummaryAnalysis.js";


/**
 * Default execution configuration.
 */
const DEFAULT_OPTIONS = {
    continueOnError: true,
    emitEvents: true,
    updateState: true,
    includeIntermediateResults: true,
};


/**
 * Default analysis pipeline.
 *
 * The ordering is deliberate.
 *
 * 1. OCR / image processing
 * 2. Document analysis
 * 3. Quality
 * 4. Completeness
 * 5. Case analysis
 * 6. Eligibility
 * 7. Compliance
 * 8. Risk
 * 9. Recommendations
 * 10. Summary
 */
const DEFAULT_PIPELINE = [
    "ocr",
    "image",
    "document",
    "quality",
    "completeness",
    "case",
    "eligibility",
    "compliance",
    "risk",
    "recommendation",
    "summary",
];


class AnalysisEngine {

    constructor({
        modules = {},
        eventBusInstance = eventBus,
        stateStore = state,
    } = {}) {

        this.eventBus =
            eventBusInstance;

        this.state =
            stateStore;

        this.modules =
            new Map();

        this.pipeline = [
            ...DEFAULT_PIPELINE
        ];

        this.executions =
            new Map();

        this.activeExecutionId =
            null;

        this.initialised =
            false;

        this.destroyed =
            false;

        this.executionCounter =
            0;

        this._registerDefaultModules();

        this._registerCustomModules(
            modules
        );
    }


    /**
     * Initialise engine.
     */
    initialise() {

        if (this.initialised) {
            return this;
        }

        if (this.destroyed) {
            throw new Error(
                "AnalysisEngine has been destroyed."
            );
        }

        this.initialised =
            true;

        this._emit(
            "ai:analysisEngineInitialised",
            {
                pipeline:
                    this.getPipeline(),
            }
        );

        return this;
    }


    /**
     * Alias for initialise().
     */
    init() {
        return this.initialise();
    }


    /**
     * Register the standard analysis modules.
     */
    _registerDefaultModules() {

        this.register(
            "case",
            new CaseAnalysis()
        );

        this.register(
            "completeness",
            new CompletenessAnalysis()
        );

        this.register(
            "compliance",
            new ComplianceAnalysis()
        );

        this.register(
            "document",
            new DocumentAnalysis()
        );

        this.register(
            "eligibility",
            new EligibilityAnalysis()
        );

        this.register(
            "image",
            new ImageAnalysis()
        );

        this.register(
            "ocr",
            new OCRAnalysis()
        );

        this.register(
            "quality",
            new QualityAnalysis()
        );

        this.register(
            "recommendation",
            new RecommendationAnalysis()
        );

        this.register(
            "risk",
            new RiskAnalysis()
        );

        this.register(
            "summary",
            new SummaryAnalysis()
        );
    }


    /**
     * Register additional or overridden modules.
     *
     * This allows the application to inject a specialised
     * implementation without changing AnalysisEngine.
     */
    _registerCustomModules(
        modules = {}
    ) {

        if (
            !modules ||
            typeof modules !== "object"
        ) {
            return;
        }

        for (
            const [
                name,
                module
            ] of Object.entries(
                modules
            )
        ) {
            this.register(
                name,
                module
            );
        }
    }


    /**
     * Register an analysis module.
     */
    register(
        name,
        module
    ) {

        if (
            typeof name !== "string" ||
            name.trim() === ""
        ) {
            throw new TypeError(
                "Analysis module name must be a non-empty string."
            );
        }

        if (!module) {
            throw new TypeError(
                `Analysis module "${name}" is invalid.`
            );
        }

        const normalisedName =
            name.trim().toLowerCase();

        if (
            typeof module !== "function" &&
            typeof module.analyse !== "function" &&
            typeof module.analyze !== "function"
        ) {
            throw new TypeError(
                `Analysis module "${normalisedName}" must implement analyse() or analyze().`
            );
        }

        this.modules.set(
            normalisedName,
            module
        );

        return this;
    }


    /**
     * Remove an analysis module.
     */
    unregister(
        name
    ) {

        return this.modules.delete(
            String(name)
                .trim()
                .toLowerCase()
        );
    }


    /**
     * Retrieve an analysis module.
     */
    getModule(
        name
    ) {

        return this.modules.get(
            String(name)
                .trim()
                .toLowerCase()
        ) || null;
    }


    /**
     * Determine whether a module exists.
     */
    hasModule(
        name
    ) {

        return this.modules.has(
            String(name)
                .trim()
                .toLowerCase()
        );
    }


    /**
     * Return registered modules.
     */
    getModules() {

        return [
            ...this.modules.keys()
        ];
    }


    /**
     * Set analysis pipeline.
     *
     * Every pipeline item must reference a registered module.
     */
    setPipeline(
        pipeline
    ) {

        if (
            !Array.isArray(pipeline) ||
            pipeline.length === 0
        ) {
            throw new TypeError(
                "Analysis pipeline must be a non-empty array."
            );
        }

        const normalised =
            pipeline.map(
                (name) =>
                    String(name)
                        .trim()
                        .toLowerCase()
            );

        for (
            const name of normalised
        ) {
            if (
                !this.modules.has(name)
            ) {
                throw new Error(
                    `Analysis pipeline references unregistered module "${name}".`
                );
            }
        }

        this.pipeline =
            [
                ...normalised
            ];

        this._emit(
            "ai:analysisPipelineChanged",
            {
                pipeline:
                    this.getPipeline(),
            }
        );

        return this;
    }


    /**
     * Return current pipeline.
     */
    getPipeline() {

        return [
            ...this.pipeline
        ];
    }


    /**
     * Execute a single analysis module.
     */
    async analyse(
        type,
        input,
        options = {}
    ) {

        this._assertUsable();

        const moduleName =
            String(type)
                .trim()
                .toLowerCase();

        const module =
            this.getModule(
                moduleName
            );

        if (!module) {
            throw new Error(
                `Analysis module "${moduleName}" is not registered.`
            );
        }

        const execution =
            this._createExecution(
                input,
                {
                    ...options,
                    type:
                        moduleName,
                }
            );

        this.activeExecutionId =
            execution.id;

        this._updateState(
            "running",
            execution
        );

        this._emit(
            "ai:analysisStarted",
            {
                executionId:
                    execution.id,

                type:
                    moduleName,

                input:
                    this._safeClone(
                        input
                    ),
            },
            options
        );

        try {

            const result =
                await this._executeModule(
                    module,
                    input,
                    {
                        ...options,

                        executionId:
                            execution.id,

                        type:
                            moduleName,

                        results:
                            execution.results,
                    }
                );

            execution.results[
                moduleName
            ] = result;

            execution.completedAt =
                new Date().toISOString();

            execution.status =
                "completed";

            this._updateState(
                "completed",
                execution
            );

            this._emit(
                "ai:analysisCompleted",
                {
                    executionId:
                        execution.id,

                    type:
                        moduleName,

                    result:
                        this._safeClone(
                            result
                        ),
                },
                options
            );

            return result;

        } catch (error) {

            execution.status =
                "failed";

            execution.error =
                this._normaliseError(
                    error
                );

            execution.completedAt =
                new Date().toISOString();

            this._updateState(
                "failed",
                execution
            );

            this._emit(
                "ai:analysisFailed",
                {
                    executionId:
                        execution.id,

                    type:
                        moduleName,

                    error:
                        execution.error,
                },
                options
            );

            throw error;

        } finally {

            this.activeExecutionId =
                null;
        }
    }


    /**
     * American spelling alias.
     */
    async analyze(
        type,
        input,
        options = {}
    ) {

        return this.analyse(
            type,
            input,
            options
        );
    }


    /**
     * Execute the complete analysis pipeline.
     */
    async analyseCase(
        input,
        options = {}
    ) {

        this._assertUsable();

        const config = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        const execution =
            this._createExecution(
                input,
                config
            );

        this.activeExecutionId =
            execution.id;

        this._updateState(
            "running",
            execution
        );

        this._emit(
            "ai:caseAnalysisStarted",
            {
                executionId:
                    execution.id,

                pipeline:
                    this.getPipeline(),
            },
            config
        );

        try {

            for (
                const moduleName of
                    this.pipeline
            ) {

                const module =
                    this.getModule(
                        moduleName
                    );

                if (!module) {

                    const error =
                        new Error(
                            `Analysis module "${moduleName}" is not registered.`
                        );

                    execution.errors.push({
                        type:
                            moduleName,

                        error:
                            this._normaliseError(
                                error
                            ),
                    });

                    if (
                        !config.continueOnError
                    ) {
                        throw error;
                    }

                    continue;
                }

                execution.currentModule =
                    moduleName;

                this._emit(
                    "ai:analysisModuleStarted",
                    {
                        executionId:
                            execution.id,

                        type:
                            moduleName,

                        index:
                            this.pipeline.indexOf(
                                moduleName
                            ),

                        total:
                            this.pipeline.length,
                    },
                    config
                );

                try {

                    const moduleInput =
                        this._buildModuleInput(
                            input,
                            execution,
                            moduleName
                        );

                    const result =
                        await this._executeModule(
                            module,
                            moduleInput,
                            {
                                ...config,

                                executionId:
                                    execution.id,

                                type:
                                    moduleName,

                                results:
                                    execution.results,
                            }
                        );

                    execution.results[
                        moduleName
                    ] = result;

                    execution.completedModules.push(
                        moduleName
                    );

                    this._emit(
                        "ai:analysisModuleCompleted",
                        {
                            executionId:
                                execution.id,

                            type:
                                moduleName,

                            result:
                                config.includeIntermediateResults
                                    ? this._safeClone(
                                        result
                                    )
                                    : null,
                        },
                        config
                    );

                } catch (error) {

                    const normalisedError =
                        this._normaliseError(
                            error
                        );

                    execution.errors.push({
                        type:
                            moduleName,

                        error:
                            normalisedError,
                    });

                    this._emit(
                        "ai:analysisModuleFailed",
                        {
                            executionId:
                                execution.id,

                            type:
                                moduleName,

                            error:
                                normalisedError,
                        },
                        config
                    );

                    if (
                        !config.continueOnError
                    ) {
                        throw error;
                    }
                }
            }

            execution.currentModule =
                null;

            execution.completedAt =
                new Date().toISOString();

            execution.status =
                execution.errors.length > 0
                    ? "completed_with_errors"
                    : "completed";

            const finalResult =
                this._buildFinalResult(
                    execution
                );

            execution.finalResult =
                finalResult;

            this._updateState(
                execution.status,
                execution
            );

            this._emit(
                "ai:caseAnalysisCompleted",
                {
                    executionId:
                        execution.id,

                    result:
                        this._safeClone(
                            finalResult
                        ),
                },
                config
            );

            return finalResult;

        } catch (error) {

            execution.status =
                "failed";

            execution.error =
                this._normaliseError(
                    error
                );

            execution.completedAt =
                new Date().toISOString();

            this._updateState(
                "failed",
                execution
            );

            this._emit(
                "ai:caseAnalysisFailed",
                {
                    executionId:
                        execution.id,

                    error:
                        execution.error,
                },
                config
            );

            throw error;

        } finally {

            execution.currentModule =
                null;

            this.activeExecutionId =
                null;
        }
    }


    /**
     * American spelling alias.
     */
    async analyzeCase(
        input,
        options = {}
    ) {

        return this.analyseCase(
            input,
            options
        );
    }


    /**
     * Build input for an individual module.
     *
     * Previous analysis results are supplied through the
     * context rather than mutating the original input.
     */
    _buildModuleInput(
        input,
        execution,
        moduleName
    ) {

        return {
            input:
                this._safeClone(
                    input
                ),

            caseData:
                this._safeClone(
                    input
                ),

            type:
                moduleName,

            executionId:
                execution.id,

            previousResults:
                this._safeClone(
                    execution.results
                ),

            completedModules:
                [
                    ...execution.completedModules
                ],

            errors:
                this._safeClone(
                    execution.errors
                ),

            context:
                this._safeClone(
                    execution.context
                ),
        };
    }


    /**
     * Execute a module using its public interface.
     */
    async _executeModule(
        module,
        input,
        context
    ) {

        if (
            typeof module ===
            "function"
        ) {
            return module(
                input,
                context
            );
        }

        if (
            typeof module.analyse ===
            "function"
        ) {
            return module.analyse(
                input,
                context
            );
        }

        if (
            typeof module.analyze ===
            "function"
        ) {
            return module.analyze(
                input,
                context
            );
        }

        throw new TypeError(
            "Analysis module does not expose analyse() or analyze()."
        );
    }


    /**
     * Create execution context.
     */
    _createExecution(
        input,
        options = {}
    ) {

        this.executionCounter += 1;

        const id =
            `analysis-${Date.now()}-${this.executionCounter}`;

        const execution = {

            id,

            status:
                "created",

            type:
                options.type ||
                "case",

            startedAt:
                new Date().toISOString(),

            completedAt:
                null,

            currentModule:
                null,

            input:
                this._safeClone(
                    input
                ),

            context:
                this._safeClone(
                    options.context ||
                    {}
                ),

            results:
                {},

            errors:
                [],

            completedModules:
                [],

            finalResult:
                null,

            error:
                null,
        };

        this.executions.set(
            id,
            execution
        );

        return execution;
    }


    /**
     * Aggregate pipeline results.
     */
    _buildFinalResult(
        execution
    ) {

        const results =
            execution.results;

        return {

            executionId:
                execution.id,

            status:
                execution.status,

            startedAt:
                execution.startedAt,

            completedAt:
                execution.completedAt,

            completedModules:
                [
                    ...execution.completedModules
                ],

            failedModules:
                execution.errors.map(
                    (entry) =>
                        entry.type
                ),

            results:
                this._safeClone(
                    results
                ),

            errors:
                this._safeClone(
                    execution.errors
                ),

            summary:
                results.summary ??
                null,

            risk:
                results.risk ??
                null,

            eligibility:
                results.eligibility ??
                null,

            compliance:
                results.compliance ??
                null,

            completeness:
                results.completeness ??
                null,

            recommendations:
                results.recommendation ??
                null,
        };
    }


    /**
     * Retrieve execution by ID.
     */
    getExecution(
        executionId
    ) {

        const execution =
            this.executions.get(
                executionId
            );

        return execution
            ? this._safeClone(
                execution
            )
            : null;
    }


    /**
     * Return active execution.
     */
    getActiveExecution() {

        if (
            !this.activeExecutionId
        ) {
            return null;
        }

        return this.getExecution(
            this.activeExecutionId
        );
    }


    /**
     * Return all executions.
     */
    getExecutions() {

        return [
            ...this.executions.values()
        ].map(
            (execution) =>
                this._safeClone(
                    execution
                )
        );
    }


    /**
     * Clear completed execution history.
     *
     * This only clears the in-memory engine history.
     * It does not affect database or persistent storage.
     */
    clearExecutions() {

        this.executions.clear();

        this.activeExecutionId =
            null;

        return this;
    }


    /**
     * Update central application state.
     *
     * AnalysisEngine only writes to the AI-related state
     * if that structure exists. It does not create a second
     * state system.
     */
    _updateState(
        status,
        execution
    ) {

        try {

            if (
                !this.state ||
                typeof this.state.set !==
                    "function"
            ) {
                return;
            }

            const aiStateExists =
                typeof this.state.has ===
                    "function"
                    ? this.state.has(
                        "ai"
                    )
                    : false;

            if (
                aiStateExists
            ) {

                this.state.set(
                    "ai.analysis",
                    {
                        executionId:
                            execution.id,

                        status,

                        currentModule:
                            execution.currentModule,

                        completedModules:
                            [
                                ...execution.completedModules
                            ],

                        failedModules:
                            execution.errors.map(
                                (entry) =>
                                    entry.type
                            ),

                        startedAt:
                            execution.startedAt,

                        completedAt:
                            execution.completedAt,
                    },
                    {
                        source:
                            "AnalysisEngine",
                    }
                );
            }

        } catch (error) {

            /*
             * State synchronisation must never cause an
             * otherwise valid AI analysis to fail.
             */
            console.warn(
                "[AnalysisEngine] State synchronisation failed:",
                error
            );
        }
    }


    /**
     * Emit an application event.
     */
    _emit(
        eventName,
        payload = {},
        options = {}
    ) {

        if (
            options.emitEvents === false
        ) {
            return;
        }

        if (
            !this.eventBus ||
            typeof this.eventBus.emit !==
                "function"
        ) {
            return;
        }

        try {

            this.eventBus.emit(
                eventName,
                {
                    ...payload,

                    timestamp:
                        new Date().toISOString(),

                    source:
                        "AnalysisEngine",
                }
            );

        } catch (error) {

            console.warn(
                `[AnalysisEngine] Failed to emit "${eventName}":`,
                error
            );
        }
    }


    /**
     * Normalise errors into serialisable data.
     */
    _normaliseError(
        error
    ) {

        if (!error) {
            return {
                name:
                    "Error",

                message:
                    "Unknown analysis error.",

                code:
                    null,

                status:
                    null,
            };
        }

        if (
            typeof error ===
            "string"
        ) {
            return {
                name:
                    "Error",

                message:
                    error,

                code:
                    null,

                status:
                    null,
            };
        }

        return {

            name:
                error.name ||
                "Error",

            message:
                error.message ||
                "An unexpected analysis error occurred.",

            code:
                error.code ||
                null,

            status:
                error.status ||
                null,
        };
    }


    /**
     * Safe clone helper.
     */
    _safeClone(
        value
    ) {

        if (
            value === undefined ||
            value === null
        ) {
            return value;
        }

        if (
            typeof structuredClone ===
            "function"
        ) {
            try {
                return structuredClone(
                    value
                );
            } catch {
                // Fall through.
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {
            return value.map(
                (item) =>
                    this._safeClone(
                        item
                    )
            );
        }

        if (
            typeof value ===
            "object"
        ) {

            const result = {};

            for (
                const [
                    key,
                    item
                ] of Object.entries(
                    value
                )
            ) {
                result[key] =
                    this._safeClone(
                        item
                    );
            }

            return result;
        }

        return value;
    }


    /**
     * Ensure engine can execute.
     */
    _assertUsable() {

        if (
            this.destroyed
        ) {
            throw new Error(
                "AnalysisEngine has been destroyed."
            );
        }

        if (
            !this.initialised
        ) {
            this.initialise();
        }
    }


    /**
     * Return engine status.
     */
    getStatus() {

        const active =
            this.getActiveExecution();

        return {

            initialised:
                this.initialised,

            destroyed:
                this.destroyed,

            modules:
                this.modules.size,

            pipeline:
                this.getPipeline(),

            executions:
                this.executions.size,

            activeExecutionId:
                this.activeExecutionId,

            activeStatus:
                active?.status ||
                null,
        };
    }


    /**
     * Destroy engine.
     *
     * Registered analysis modules are not destroyed
     * automatically because they may be shared by another
     * AI subsystem.
     */
    destroy() {

        if (
            this.destroyed
        ) {
            return;
        }

        this.executions.clear();

        this.activeExecutionId =
            null;

        this.modules.clear();

        this.initialised =
            false;

        this.destroyed =
            true;
    }
}


/**
 * Singleton AnalysisEngine.
 *
 * The application should normally use this instance so
 * all AI analysis components communicate through one
 * orchestration layer.
 */
export const analysisEngine =
    new AnalysisEngine();


/**
 * Named exports.
 */
export {
    AnalysisEngine,
    DEFAULT_OPTIONS,
    DEFAULT_PIPELINE,
};


/**
 * Default export.
 */
export default analysisEngine;export default class AnalysisEngine {
    constructor({
        analyzers = {},
        confidenceEngine = null,
        audit = null
    } = {}) {
        this.analyzers = new Map(
            Object.entries(analyzers)
        );

        this.confidenceEngine =
            confidenceEngine;

        this.audit = audit;
    }

    register(name, analyzer) {
        this.analyzers.set(
            name,
            analyzer
        );
    }

    async analyze(
        type,
        input,
        context = {}
    ) {
        const analyzer =
            this.analyzers.get(type);

        if (!analyzer) {
            throw new Error(
                `AI analyzer not registered: ${type}`
            );
        }

        const result =
            await analyzer.analyze(
                input,
                context
            );

        const confidence =
            this.confidenceEngine?.calculate?.(
                result,
                context
            );

        const finalResult = {
            type,
            result,
            confidence,
            timestamp:
                new Date().toISOString()
        };

        await this.audit?.recordSuccess?.({
            action:
                "AI_ANALYSIS_COMPLETED",
            eventType: "AI",
            matterId:
                context.matterId || null,
            metadata: {
                type,
                confidence
            }
        });

        return finalResult;
    }
}
