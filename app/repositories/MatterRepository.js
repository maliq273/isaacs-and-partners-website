/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * MatterRepository.js
 *
 * FILE ID
 * REP-002
 *
 * LOCATION
 * app/repositories/MatterRepository.js
 *
 * EXTENDS
 * BaseRepository
 *
 * VERSION
 * 1.0.0
 * ============================================================
 */

import BaseRepository from "./BaseRepository.js";

export default class MatterRepository extends BaseRepository {

    /*=====================================================
        MAT-REP-001
        Constructor
    =====================================================*/

    constructor(storage) {

        super(storage);

    }

    /*=====================================================
        MAT-REP-002
        Queries
    =====================================================*/

    async findByReference(referenceNumber) {

        return this.search({

            referenceNumber

        });

    }

    async findByClient(clientId) {

        return this.search({

            clientId

        });

    }

    async findByConsultant(consultantId) {

        return this.search({

            consultantId

        });

    }

    async findByDepartment(department) {

        return this.search({

            department

        });

    }

    async findByStatus(status) {

        return this.search({

            status

        });

    }

    async findByStage(stage) {

        return this.search({

            stage

        });

    }

    async findByPriority(priority) {

        return this.search({

            priority

        });

    }

    /*=====================================================
        MAT-REP-003
        Statistics
    =====================================================*/

    async statistics() {

        return {

            total: await this.count()

        };

    }

    /*=====================================================
        MAT-REP-004
        Reserved
    =====================================================*/

    fullTextSearch() {}

    archive() {}

    restore() {}

    rebuildIndexes() {}

}
