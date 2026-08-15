export default class Recommendations {
    constructor({
        analysis,
        planner
    } = {}) {
        this.analysis = analysis;
        this.planner = planner;
    }

    async generate(context = {}) {
        const analysis =
            await this.analysis?.analyze?.(
                context
            );

        const actions =
            this.planner?.plan?.(
                {
                    ...context,
                    recommendations:
                        analysis
                }
            ) || [];

        return {
            recommendations:
                analysis?.recommendations ||
                [],
            actions
        };
    }
}
