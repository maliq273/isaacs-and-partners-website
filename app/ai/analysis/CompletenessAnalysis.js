/**
 * ============================================================
 * DOCUMENT COMPLETENESS
 * ============================================================
 */

export default class CompletenessAnalysis {

    static analyse(matter) {

        const required = matter.documents.filter(

            d => d.required

        );

        const received = required.filter(

            d => d.verified

        );

        const percentage =

            required.length === 0

                ? 0

                : Math.round(

                    (received.length / required.length) * 100

                );

        return {

            percentage,

            required: required.length,

            received: received.length,

            outstanding:

                required.length - received.length

        };

    }

}
