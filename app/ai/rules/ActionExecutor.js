export default class ActionExecutor {
    constructor() {
        this.actions = new Map();
    }

    register(name, action) {
        this.actions.set(
            name,
            action
        );
    }

    async execute(
        name,
        context
    ) {
        const action =
            this.actions.get(name);

        if (!action) {
            throw new Error(
                `AI action not registered: ${name}`
            );
        }

        return action(context);
    }
}
