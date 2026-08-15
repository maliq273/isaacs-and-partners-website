export default class TransitionManager {
    constructor() {
        this.transitions = new Map();
    }

    register(
        from,
        to,
        condition = () => true
    ) {
        const key = `${from}->${to}`;

        this.transitions.set(
            key,
            condition
        );
    }

    async canTransition(
        from,
        to,
        context
    ) {
        const condition =
            this.transitions.get(
                `${from}->${to}`
            );

        if (!condition) {
            return false;
        }

        return Boolean(
            await condition(context)
        );
    }
}
