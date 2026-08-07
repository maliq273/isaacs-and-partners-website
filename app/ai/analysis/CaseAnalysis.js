/**
 * ============================================================
 * CASE ANALYSIS
 * Master AI Analysis Coordinator
 * ============================================================
 */

import RiskAnalysis from "./RiskAnalysis.js";
import EligibilityAnalysis from "./EligibilityAnalysis.js";
import CompletenessAnalysis from "./CompletenessAnalysis.js";
import RecommendationAnalysis from "./RecommendationAnalysis.js";
import SummaryAnalysis from "./SummaryAnalysis.js";

export default class CaseAnalysis {

    static analyse(matter) {

        return {

            risk: RiskAnalysis.analyse(matter),

            eligibility: EligibilityAnalysis.analyse(matter),

            completeness: CompletenessAnalysis.analyse(matter),

            recommendations: RecommendationAnalysis.analyse(matter),

            summary: SummaryAnalysis.analyse(matter)

        };

    }

}
