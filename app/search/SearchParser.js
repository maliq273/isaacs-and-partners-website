/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchParser
 * ------------------------------------------------------------
 * Converts raw search input into SearchQuery objects.
 * ============================================================
 */

import SearchQuery
    from "./SearchQuery.js";

export default class SearchParser {

    parse(
        input,
        options = {}
    ) {

        if (
            input instanceof SearchQuery
        ) {

            return input;

        }

        const raw =
            String(input ?? "").trim();

        const filters = {
            ...(options.filters ?? {})
        };

        const terms = [];

        const quoted =
            raw.match(
                /"([^"]+)"/g
            ) ?? [];

        for (const phrase of quoted) {

            const value =
                phrase.slice(
                    1,
                    -1
                );

            if (value) {

                terms.push(
                    value
                );

            }

        }

        const withoutQuotes =
            raw.replace(
                /"([^"]+)"/g,
                ""
            );

        const parts =
            withoutQuotes
                .split(/\s+/)
                .filter(Boolean);


        for (const part of parts) {

            const filter =
                this.parseFilter(
                    part
                );

            if (filter) {

                filters[
                    filter.field
                ] = filter.value;

            } else {

                terms.push(part);

            }

        }

        return new SearchQuery({

            ...options,

            raw,

            text:
                terms.join(" "),

            filters

        });

    }


    parseFilter(
        token
    ) {

        const match =
            token.match(
                /^([a-zA-Z_][\w-]*):(.+)$/
            );

        if (!match) {

            return null;

        }

        return {

            field:
                match[1],

            value:
                match[2]

        };

        // ====================================================
        // FUTURE INSERT
        //
        // status:
        // type:
        // department:
        // client:
        // matter:
        // date:
        // document:
        // assigned:
        // ====================================================
    }

}
