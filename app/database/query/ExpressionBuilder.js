import {
    quoteIdentifier
} from "../functions/DatabaseFunctions.js";

export default class ExpressionBuilder {
    constructor() {
        this.expressions = [];
        this.parameters = {};
    }

    raw(sql, parameters = {}) {
        if (!sql || typeof sql !== "string") {
            throw new TypeError(
                "SQL expression must be a string"
            );
        }

        this.expressions.push(sql);
        Object.assign(
            this.parameters,
            parameters
        );

        return this;
    }

    equals(column, parameter) {
        this.expressions.push(
            `${quoteIdentifier(column)} = :${parameter}`
        );

        return this;
    }

    notEquals(column, parameter) {
        this.expressions.push(
            `${quoteIdentifier(column)} != :${parameter}`
        );

        return this;
    }

    isNull(column) {
        this.expressions.push(
            `${quoteIdentifier(column)} IS NULL`
        );

        return this;
    }

    isNotNull(column) {
        this.expressions.push(
            `${quoteIdentifier(column)} IS NOT NULL`
        );

        return this;
    }

    in(column, parameters) {
        if (!Array.isArray(parameters) || !parameters.length) {
            this.expressions.push("1 = 0");
            return this;
        }

        const placeholders =
            parameters.map(
                (parameter) => `:${parameter}`
            );

        this.expressions.push(
            `${quoteIdentifier(column)} IN (${placeholders.join(", ")})`
        );

        return this;
    }

    build(operator = "AND") {
        return {
            sql:
                this.expressions.length
                    ? this.expressions.join(
                          ` ${operator} `
                      )
                    : "1 = 1",
            parameters: {
                ...this.parameters
            }
        };
    }
}
