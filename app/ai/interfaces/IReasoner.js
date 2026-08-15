export default class IReasoner {
    async reason() {
        throw new Error(
            "Reasoner must implement reason()"
        );
    }
}
