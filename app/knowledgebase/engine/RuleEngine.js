/**
 * RuleEngine
 * ------------------------------------------------------------
 * Deterministic legal/business rule evaluation layer.
 *
 * The engine deliberately separates:
 *
 * 1. Rule definition
 * 2. Rule evaluation
 * 3. Evidence
 * 4. Result
 *
 * This prevents the AI from presenting an unsupported inference
 * as established law.
 */

export class RuleEngine {
    constructor({
        logger = console
    } = {}) {
        this.logger = logger;
        this.rules = new Map();
    }

    /**
     * Register a rule.
     */
    register(rule) {
        this.validateRule(rule);

        this.rules.set(rule.id, {
            priority: 100,
            enabled: true,
            ...rule
        });

        return this.rules.get(rule.id);
    }

    /**
     * Register multiple rules.
     */
    registerMany(rules = []) {
        rules.forEach((rule) =>
            this.register(rule)
        );

        return rules;
    }

    /**
     * Remove rule.
     */
    remove(ruleId) {
        return this.rules.delete(ruleId);
    }

    /**
     * Retrieve rule.
     */
    get(ruleId) {
        return this.rules.get(ruleId) || null;
    }

    /**
     * Retrieve rules.
     */
    getAll() {
        return Array.from(this.rules.values()).sort(
            (a, b) => b.priority - a.priority
        );
    }

    /**
     * Evaluate all applicable rules.
     */
    evaluate(context = {}, options = {}) {
        const {
            domainId = null,
            ruleIds = null
        } = options;

        let rules = this.getAll();

        if (domainId) {
            rules = rules.filter(
                (rule) =>
                    !rule.domainId ||
                    rule.domainId === domainId
            );
        }

        if (Array.isArray(ruleIds)) {
            rules = rules.filter((rule) =>
                ruleIds.includes(rule.id)
            );
        }

        const results = [];

        for (const rule of rules) {
            if (!rule.enabled) {
                continue;
            }

            try {
                const matched =
                    typeof rule.when === "function"
                        ? Boolean(rule.when(context))
                        : this.evaluateConditions(
                              rule.conditions,
                              context
                          );

                results.push({
                    ruleId: rule.id,
                    name: rule.name,
                    matched,
                    action: matched
                        ? rule.action || null
                        : null,
                    authority:
                        rule.authority ||
                        "INTERNAL_RULE",
                    sourceReference:
                        rule.sourceReference || null,
                    reasoning:
                        matched
                            ? rule.reasoning || null
                            : null
                });
            } catch (error) {
                results.push({
                    ruleId: rule.id,
                    name: rule.name,
                    matched: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Evaluate conditions.
     */
    evaluateConditions(
        conditions = [],
        context = {}
    ) {
        if (!Array.isArray(conditions)) {
            return true;
        }

        return conditions.every(
            (condition) =>
                this.evaluateCondition(
                    condition,
                    context
                )
        );
    }

    /**
     * Evaluate one condition.
     */
    evaluateCondition(
        condition,
        context
    ) {
        const value = this.resolvePath(
            context,
            condition.path
        );

        const expected = condition.value;

        switch (condition.operator) {
            case "equals":
                return value === expected;

            case "notEquals":
                return value !== expected;

            case "exists":
                return (
                    value !== undefined &&
                    value !== null
                );

            case "contains":
                return Array.isArray(value)
                    ? value.includes(expected)
                    : String(value || "")
                          .toLowerCase()
                          .includes(
                              String(expected)
                                  .toLowerCase()
                          );

            case "greaterThan":
                return value > expected;

            case "lessThan":
                return value < expected;

            case "greaterThanOrEqual":
                return value >= expected;

            case "lessThanOrEqual":
                return value <= expected;

            default:
                throw new Error(
                    `Unsupported rule operator: ${condition.operator}`
                );
        }
    }

    /**
     * Resolve nested context path.
     */
    resolvePath(object, path) {
        if (!path) {
            return undefined;
        }

        return String(path)
            .split(".")
            .reduce(
                (current, key) =>
                    current == null
                        ? undefined
                        : current[key],
                object
            );
    }

    /**
     * Validate rule.
     */
    validateRule(rule) {
        if (!rule || typeof rule !== "object") {
            throw new TypeError(
                "Rule must be an object"
            );
        }

        if (!rule.id) {
            throw new Error(
                "Rule requires an id"
            );
        }

        if (
            rule.when &&
            typeof rule.when !== "function"
        ) {
            throw new TypeError(
                `Rule "${rule.id}" has invalid when function`
            );
        }

        if (
            rule.conditions &&
            !Array.isArray(rule.conditions)
        ) {
            throw new TypeError(
                `Rule "${rule.id}" conditions must be an array`
            );
        }
    }
}

export default RuleEngine;
