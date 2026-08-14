import {
    quoteIdentifier
} from "../functions/DatabaseFunctions.js";

export default class FilterBuilder {
    constructor() {
        this.filters = [];
        this.parameters = {};
        this.counter = 0;
    }

    add(
        column,
        operator,
        value
    ) {
        const parameter =
            `filter_${++this.counter}`;

        this.filters.push(
            `${quoteIdentifier(column)} ${operator} :${parameter}`
        );

        this.parameters[parameter] =
            value;

        return this;
    }

    equals(column, value) {
        return this.add(
            column,
            "=",
            value
        );
    }

    notEquals(column, value) {
        return this.add(
            column,
            "!=",
            value
        );
    }

    greaterThan(column, value) {
        return this.add(
            column,
            ">",
            value
        );
    }

    greaterThanOrEqual(
        column,
        value
    ) {
        return this.add(
            column,
            ">=",
            value
        );
    }

    lessThan(column, value) {
        return this.add(
            column,
            "<",
            value
        );
    }

    lessThanOrEqual(
        column,
        value
    ) {
        return this.add(
            column,
            "<=",
            value
        );
    }

    build() {
        return {
            sql: this.filters.length
                ? this.filters.join(
                      " AND "
                  )
                : "1 = 1",
            parameters: {
                ...this.parameters
            }
        };
    }
}
