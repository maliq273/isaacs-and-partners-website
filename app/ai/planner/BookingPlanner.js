export default class BookingPlanner {
    plan({
        required = false,
        availableSlots = []
    } = {}) {
        if (!required) {
            return {
                required: false
            };
        }

        return {
            required: true,
            slots: availableSlots
        };
    }
}
