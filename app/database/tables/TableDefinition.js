export default class TableDefinition {
    constructor({
        name,
        primaryKey = "id",
        columns = [],
        indexes = []
    }) {
        if (!name) {
            throw new Error(
                "Table name is required"
            );
        }

        this.name = name;
        this.primaryKey = primaryKey;
        this.columns = [...columns];
        this.indexes = [...indexes];
    }

    hasColumn(column) {
        return this.columns.includes(column);
    }

    getColumnNames() {
        return [...this.columns];
    }

    getDefinition() {
        return {
            name: this.name,
            primaryKey: this.primaryKey,
            columns: this.getColumnNames(),
            indexes: [...this.indexes]
        };
    }
}
