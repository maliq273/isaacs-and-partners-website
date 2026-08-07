export default class SummaryAnalysis {

    static analyse(matter) {

        return {

            summary:

`Matter "${matter.title}" is currently ${matter.status}
with ${matter.documents.length} documents,
${matter.tasks.length} tasks
and ${matter.appointments.length} appointments.`

        };

    }

}
