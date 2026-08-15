export default class MatterMemory {
    constructor() {
        this.matters = new Map();
    }

    set(matterId, data) {
        this.matters.set(
            matterId,
            {
                ...data
            }
        );
    }

    get(matterId) {
        return this.matters.get(
            matterId
        );
    }

    clear(matterId) {
        this.matters.delete(
            matterId
        );
    }
}
