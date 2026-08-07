export default class RecommendationAnalysis {

    static analyse(matter) {

        const recommendations = [];

        if (matter.documents.length === 0)

            recommendations.push(

                "Request supporting documents."

            );

        if (matter.tasks.some(t => !t.completed))

            recommendations.push(

                "Complete outstanding tasks."

            );

        return recommendations;

    }

}
