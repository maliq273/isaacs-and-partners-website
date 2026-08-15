export default class RuleEvaluator {
    async evaluate(
        rule,
        context = {}
    ) {
        if (
            typeof rule === "function"
        ) {
            return Boolean(
                await rule(context)
            );
        }

        if (
            rule &&
            typeof rule.evaluate ===
                "function"
        ) {
            return Boolean(
                await rule.evaluate(
                    context
                )
            );
        }

        return false;
    }
}
