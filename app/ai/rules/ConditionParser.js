export default class ConditionParser {
    parse(condition) {
        if (
            typeof condition ===
            "function"
        ) {
            return condition;
        }

        if (
            !condition ||
            typeof condition !==
                "object"
        ) {
            return () => false;
        }

        return context => {
            const value =
                context[
                    condition.field
                ];

            switch (
                condition.operator
            ) {
                case "===":
                    return (
                        value ===
                        condition.value
                    );

                case "!==":
                    return (
                        value !==
                        condition.value
                    );

                case ">":
                    return (
                        value >
                        condition.value
                    );

                case "<":
                    return (
                        value <
                        condition.value
                    );

                case ">=":
                    return (
                        value >=
                        condition.value
                    );

                case "<=":
                    return (
                        value <=
                        condition.value
                    );

                case "IN":
                    return Array.isArray(
                        condition.value
                    )
                        ? condition.value.includes(
                              value
                          )
                        : false;

                default:
                    return false;
            }
        };
    }
}
