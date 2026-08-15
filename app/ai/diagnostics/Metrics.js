export default class Metrics {
    constructor() {
        this.counters = new Map();
        this.timings = new Map();
    }

    increment(
        name,
        amount = 1
    ) {
        this.counters.set(
            name,
            (this.counters.get(name) || 0) +
                amount
        );
    }

    timing(name, duration) {
        if (!this.timings.has(name)) {
            this.timings.set(
                name,
                []
            );
        }

        this.timings
            .get(name)
            .push(duration);
    }

    snapshot() {
        return {
            counters:
                Object.fromEntries(
                    this.counters
                ),

            timings:
                Object.fromEntries(
                    [
                        ...this.timings.entries()
                    ].map(
                        ([key, values]) => [
                            key,
                            {
                                count:
                                    values.length,
                                average:
                                    values.reduce(
                                        (a, b) =>
                                            a + b,
                                        0
                                    ) /
                                    values.length
                            }
                        ]
                    )
                )
        };
    }
}
