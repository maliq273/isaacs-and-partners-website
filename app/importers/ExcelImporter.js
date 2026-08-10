/**
 * Isaacs & Partners
 * Excel Importer
 *
 * Adapter around an injected XLSX-compatible parser.
 *
 * No spreadsheet library is hard-coded into the application.
 * This keeps the core application independent of SheetJS/XLSX
 * or another implementation.
 */

export class ExcelImporter {
    constructor({
        parser = null,
        logger = console
    } = {}) {
        this.parser = parser;
        this.logger = logger;
        this.name = "ExcelImporter";
    }

    async import(source, options = {}) {
        if (!this.parser) {
            throw new Error(
                "ExcelImporter requires an injected spreadsheet parser"
            );
        }

        const workbook =
            await this.readWorkbook(
                source
            );

        const sheetNames =
            options.sheetNames ||
            this.getSheetNames(
                workbook
            );

        const sheets = {};

        for (const sheetName of sheetNames) {
            sheets[sheetName] =
                await this.parseSheet(
                    workbook,
                    sheetName,
                    options
                );
        }

        return {
            sheets,
            sheetNames,
            count: sheetNames.length
        };
    }

    async readWorkbook(source) {
        if (
            typeof this.parser.read ===
            "function"
        ) {
            return this.parser.read(
                source
            );
        }

        if (
            typeof this.parser.parse ===
            "function"
        ) {
            return this.parser.parse(
                source
            );
        }

        throw new Error(
            "Injected spreadsheet parser does not implement read() or parse()"
        );
    }

    getSheetNames(workbook) {
        if (
            Array.isArray(
                workbook?.sheetNames
            )
        ) {
            return workbook.sheetNames;
        }

        if (
            Array.isArray(
                workbook?.SheetNames
            )
        ) {
            return workbook.SheetNames;
        }

        if (
            workbook?.sheets &&
            typeof workbook.sheets ===
                "object"
        ) {
            return Object.keys(
                workbook.sheets
            );
        }

        throw new Error(
            "Unable to determine Excel sheet names"
        );
    }

    async parseSheet(
        workbook,
        sheetName,
        options
    ) {
        if (
            typeof this.parser.toRecords ===
            "function"
        ) {
            return this.parser.toRecords(
                workbook,
                sheetName,
                options
            );
        }

        const sheet =
            workbook.sheets?.[
                sheetName
            ] ||
            workbook.Sheets?.[
                sheetName
            ];

        if (
            !sheet
        ) {
            throw new Error(
                `Excel sheet not found: ${sheetName}`
            );
        }

        if (
            Array.isArray(sheet)
        ) {
            return sheet;
        }

        throw new Error(
            `Parser must provide toRecords() for sheet: ${sheetName}`
        );
    }
}

export default ExcelImporter;
