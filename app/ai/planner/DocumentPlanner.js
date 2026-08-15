export default class DocumentPlanner {
    plan({
        required = [],
        supplied = []
    } = {}) {
        const suppliedTypes =
            new Set(
                supplied.map(
                    document =>
                        document.type
                )
            );

        return required
            .filter(
                requirement =>
                    !suppliedTypes.has(
                        requirement.type ||
                        requirement
                    )
            )
            .map(
                requirement => ({
                    action:
                        "REQUEST_DOCUMENT",
                    document:
                        requirement
                })
            );
    }
}
