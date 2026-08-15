export default class IPlanner {
    async plan() {
        throw new Error(
            "Planner must implement plan()"
        );
    }
}
