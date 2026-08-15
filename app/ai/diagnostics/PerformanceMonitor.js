export default class PerformanceMonitor {
    async measure(
        name,
        operation
    ) {
        const start =
            performance.now();

        try {
            const result =
                await operation();

            return {
                name,
                result,
                duration:
                    performance.now() -
                    start,
                success: true
            };
        } catch (error) {
            return {
                name,
                error,
                duration:
                    performance.now() -
                    start,
                success: false
            };
        }
    }
}
