export default class CheckpointManager {
    constructor() {
        this.checkpoints = new Map();
    }

    save(id, state) {
        this.checkpoints.set(
            id,
            structuredClone(state)
        );
    }

    load(id) {
        const state =
            this.checkpoints.get(id);

        return state
            ? structuredClone(state)
            : null;
    }

    remove(id) {
        this.checkpoints.delete(id);
    }
}
