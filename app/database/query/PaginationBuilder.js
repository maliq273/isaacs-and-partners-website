export default class PaginationBuilder {
    constructor({
        page = 1,
        pageSize = 50,
        maxPageSize = 500
    } = {}) {
        this.maxPageSize =
            maxPageSize;

        this.page =
            Math.max(
                1,
                Number.parseInt(
                    page,
                    10
                ) || 1
            );

        this.pageSize =
            Math.min(
                Math.max(
                    1,
                    Number.parseInt(
                        pageSize,
                        10
                    ) || 50
                ),
                maxPageSize
            );
    }

    get offset() {
        return (
            (this.page - 1) *
            this.pageSize
        );
    }

    build() {
        return {
            limit: this.pageSize,
            offset: this.offset,
            page: this.page,
            pageSize: this.pageSize
        };
    }

    metadata(total) {
        const totalItems =
            Math.max(
                0,
                Number(total) || 0
            );

        const totalPages =
            Math.ceil(
                totalItems /
                    this.pageSize
            );

        return {
            page: this.page,
            pageSize: this.pageSize,
            totalItems,
            totalPages,
            hasNextPage:
                this.page <
                totalPages,
            hasPreviousPage:
                this.page > 1
        };
    }
}
