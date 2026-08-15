export default class IKnowledgeProvider {
    async search() {
        throw new Error(
            "Knowledge provider must implement search()"
        );
    }
}
