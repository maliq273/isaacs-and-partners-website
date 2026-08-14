import {
    quoteIdentifier
} from "../functions/DatabaseFunctions.js";

export default class QueryBuilder {
    constructor() {
        this.tableName = null;
        this.columns = ["*"];
        this.conditions = [];
        this.parameters = {};
        this.orderBy = null;
        this.limitValue = null;
        this.offsetValue = null;
        this.joins = [];
        this.groupByColumns = [];
        this.havingClause = null;
    }

    from(table) {
        this.tableName = table;
        return this;
    }

    select(columns = ["*"]) {
        this.columns =
            columns === "*"
                ? ["*"]
                : Array.isArray(columns)
                ? columns
                : [columns];

        return this;
    }

    where(
        sql,
        parameters = {}
    ) {
        this.conditions.push(
            `(${sql})`
        );

        Object.assign(
            this.parameters,
            parameters
        );

        return this;
    }

    join(
        table,
        condition,
        type = "INNER"
    ) {
        const normalizedType =
            String(type).toUpperCase();

        const allowed = [
            "INNER",
            "LEFT",
            "RIGHT",
            "FULL"
        ];

        if (
            !allowed.includes(
                normalizedType
            )
        ) {
            throw new Error(
                `Unsupported JOIN type: ${type}`
            );
        }

        this.joins.push(
            `${normalizedType} JOIN ${quoteIdentifier(
                table
            )} ON ${condition}`
        );

        return this;
    }

    groupBy(columns = []) {
        this.groupByColumns =
            Array.isArray(columns)
                ? columns
                : [columns];

        return this;
    }

    having(sql, parameters = {}) {
        this.havingClause = sql;

        Object.assign(
            this.parameters,
            parameters
        );

        return this;
    }

    orderByRaw(sql) {
        this.orderBy = sql;
        return this;
    }

    limit(value) {
        this.limitValue =
            Number.parseInt(
                value,
                10
            );

        return this;
    }

    offset(value) {
        this.offsetValue =
            Number.parseInt(
                value,
                10
            );

        return this;
    }

    buildSelect() {
        if (!this.tableName) {
            throw new Error(
                "Query table has not been specified"
            );
        }

        const columns =
            this.columns
                .map((column) =>
                    column === "*"
                        ? "*"
                        : quoteIdentifier(
                              column
                          )
                )
                .join(", ");

        let sql =
            `SELECT ${columns} FROM ${quoteIdentifier(
                this.tableName
            )}`;

        if (this.joins.length) {
            sql +=
                " " +
                this.joins.join(" ");
        }

        if (this.conditions.length) {
            sql +=
                " WHERE " +
                this.conditions.join(
                    " AND "
                );
        }

        if (this.groupByColumns.length) {
            sql +=
                " GROUP BY " +
                this.groupByColumns
                    .map(
                        quoteIdentifier
                    )
                    .join(", ");
        }

        if (this.havingClause) {
            sql +=
                ` HAVING ${this.havingClause}`;
        }

        if (this.orderBy) {
            sql +=
                ` ORDER BY ${this.orderBy}`;
        }

        if (
            Number.isInteger(
                this.limitValue
            )
        ) {
            sql += ` LIMIT ${this.limitValue}`;
        }

        if (
            Number.isInteger(
                this.offsetValue
            )
        ) {
            sql += ` OFFSET ${this.offsetValue}`;
        }

        return {
            sql,
            parameters: {
                ...this.parameters
            }
        };
    }
}
