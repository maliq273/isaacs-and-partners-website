/**
 * ============================================================
 * AI RISK ANALYSIS
 * ============================================================
 */

export default class RiskAnalysis {

    static analyse(matter) {

        let score = 0;

        if (matter.documents.length === 0)

            score += 50;

        if (matter.status === "ON_HOLD")

            score += 15;

        if (matter.tasks.some(t => !t.completed))

            score += 10;

        return {

            score,

            level:

                score >= 70

                    ? "HIGH"

                    : score >= 40

                    ? "MEDIUM"

                    : "LOW"

        };

    }

}
