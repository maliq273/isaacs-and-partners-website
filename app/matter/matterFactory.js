/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Factory
 * ------------------------------------------------------------
 * Creates Matter domain aggregates consistently.
 * ============================================================
 */

import Matter from "../models/Matter.js";

export default class MatterFactory {

    create(data = {}) {

        if (
            !data ||
            typeof data !== "object"
        ) {

            throw new Error(
                "Matter data must be an object."
            );

        }

        const matter =
            new Matter(data);

        if (
            typeof matter.validate ===
            "function"
        ) {

            matter.validate();

        }

        return matter;

    }


    createFromClient(
        clientId,
        data = {}
    ) {

        return this.create({

            ...data,

            clientId

        });

    }


    createFromCompany(
        companyId,
        data = {}
    ) {

        return this.create({

            ...data,

            companyId

        });

    }


    createFromSource(
        source,
        data = {}
    ) {

        return this.create({

            ...data,

            source

        });

    }


    clone(
        matter,
        overrides = {}
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        const source =
            typeof matter.toJSON ===
            "function"
                ? matter.toJSON()
                : {
                    ...matter
                };

        delete source.id;

        return this.create({

            ...source,

            referenceNumber: "",
            status: undefined,
            stage: undefined,
            outcome: undefined,
            documents: [],
            appointments: [],
            communications: [],
            tasks: [],
            notes: [],
            timeline: [],

            ...overrides

        });

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Matter-type factories
    // Immigration Matter
    // HR Matter
    // CCMA Matter
    // Labour Matter
    // Legal Matter
    // Business Matter
    // ========================================================

}
