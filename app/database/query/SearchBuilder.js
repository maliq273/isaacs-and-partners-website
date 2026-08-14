import {
    buildMultiColumnSearch,
    createSearchPattern
} from "../functions/SearchFunctions.js";

export default class SearchBuilder {
    constructor() {
        this.columns = [];
        this.parameter = "search";
        this.value = null;
    }

    addColumn(column) {
        this.columns.push(column);
        return this;
    }

    addColumns(columns = []) {
        for (const column of columns) {
            this.addColumn(column);
        }

        return this;
    }

    setValue(value) {
        this.value = value;
        return this;
    }

    build() {
        const condition =
            buildMultiColumnSearch({
                columns: this.columns,
                parameter:
                    this.parameter
            });

        return {
            sql: condition.sql,
            parameters: {
                [this.parameter]:
                    createSearchPattern(
                        this.value || ""
                    )
            }
        };
    }
}
