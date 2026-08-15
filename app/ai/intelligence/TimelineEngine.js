export default class TimelineEngine {
    calculate(events = []) {
        return [...events].sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );
    }

    nextDeadline(events = []) {
        const now = Date.now();

        return (
            events
                .filter(
                    event =>
                        event.deadline &&
                        new Date(
                            event.deadline
                        ).getTime() >= now
                )
                .sort(
                    (a, b) =>
                        new Date(
                            a.deadline
                        ) -
                        new Date(
                            b.deadline
                        )
                )[0] || null
        );
    }
}
