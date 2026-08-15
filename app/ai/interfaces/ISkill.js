export default class ISkill {
    constructor(name) {
        this.name = name;
    }

    supports() {
        return false;
    }

    async execute() {
        throw new Error(
            `${this.name} must implement execute()`
        );
    }
}
