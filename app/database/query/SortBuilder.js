import {
    quoteIdentifier
} from "../functions/DatabaseFunctions.js";

export default class SortBuilder {
    constructor() {
        this.sorts = [];
    }

    add(
        column,
        direction = "ASC"
    ) {
        const normalizedDirection =
            String(direction)
                .toUpperCase() ===
            "DESC"
                ? "DESC"
                : "ASC";

        this.sorts.push(
            `${quoteIdentifier(column)} ${normalizedDirection}`
        );

        return this;
    }

    ascending(column) {
        return this.add(
            column,
            "ASC"
        );
    }

    descending(column) {
        return this.add(
            column,
            "DESC"
        );
    }

    build(
        fallback = '"created_at" DESC'
    ) {
        return this.sorts.length
            ? this.sorts.join(", ")
            : fallback;
    }
}
