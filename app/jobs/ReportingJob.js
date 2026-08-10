/**
 * ReportingJob
 * ------------------------------------------------------------
 * Generates scheduled reports.
 *
 * Designed to integrate with:
 * - ReportingService
 * - ReportingManager
 * - ReportRepository
 */

export class ReportingJob {
    constructor({
        reportingService = null,
        reportingManager = null,
        logger = console
    } = {}) {
        this.reportingService =
            reportingService;

        this.reportingManager =
            reportingManager;

        this.logger = logger;
        this.name = "ReportingJob";
    }

    async execute(reportRequest = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.generate(
                    reportRequest
                );

            return {
                success: true,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                duration:
                    Date.now() - startedAt,
                result
            };
        } catch (error) {
            this.logger.error(
                `${this.name} failed`,
                error
            );

            return {
                success: false,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                error: {
                    message:
                        error?.message ||
                        "Report generation failed"
                }
            };
        }
    }

    async generate(request) {
        if (
            this.reportingManager &&
            typeof this.reportingManager.generate ===
                "function"
        ) {
            return this.reportingManager.generate(
                request
            );
        }

        if (
            this.reportingService &&
            typeof this.reportingService.generate ===
                "function"
        ) {
            return this.reportingService.generate(
                request
            );
        }

        throw new Error(
            "ReportingJob requires ReportingManager or ReportingService"
        );
    }
}

export default ReportingJob;
