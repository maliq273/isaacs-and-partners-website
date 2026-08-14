/**
 * Isaacs and Partners
 * Consultation Review
 *
 * Responsible for displaying collected consultation
 * information before the assessment/submission stages.
 */

import {
    getQuestionById,
} from "./questions.js";

export class ConsultationReview {
    constructor(options = {}) {
        this.container =
            options.container || null;

        this.onEdit =
            options.onEdit || null;
    }

    render(data = {}) {
        if (!this.container) {
            return "";
        }

        const entries =
            this._flattenObject(data);

        this.container.innerHTML = "";

        if (entries.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <h2>No information entered</h2>
                    <p>
                        Return to the consultation questions
                        and provide the required information.
                    </p>
                </div>
            `;

            return this.container.innerHTML;
        }

        const fragment =
            document.createDocumentFragment();

        for (const entry of entries) {
            const question =
                getQuestionById(entry.path);

            const section =
                document.createElement("section");

            section.className =
                "consultation-review-item";

            const label =
                document.createElement("h3");

            label.textContent =
                question?.label ||
                this._humanisePath(entry.path);

            const value =
                document.createElement("p");

            value.textContent =
                this._formatValue(
                    entry.value
                );

            section.append(
                label,
                value
            );

            if (this.onEdit) {
                const button =
                    document.createElement("button");

                button.type = "button";
                button.className =
                    "btn btn-secondary";
                button.dataset.editPath =
                    entry.path;
                button.textContent =
                    "Edit";

                button.addEventListener(
                    "click",
                    () => {
                        this.onEdit(
                            entry.path
                        );
                    }
                );

                section.append(button);
            }

            fragment.append(section);
        }

        this.container.append(fragment);

        return this.container.innerHTML;
    }

    _flattenObject(
        object,
        prefix = ""
    ) {
        const result = [];

        if (
            object === null ||
            object === undefined
        ) {
            return result;
        }

        if (
            typeof object !== "object" ||
            object instanceof Date
        ) {
            result.push({
                path: prefix,
                value: object,
            });

            return result;
        }

        for (
            const [key, value]
            of Object.entries(object)
        ) {
            const path =
                prefix
                    ? `${prefix}.${key}`
                    : key;

            if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                !(value instanceof Date)
            ) {
                result.push(
                    ...this._flattenObject(
                        value,
                        path
                    )
                );
            } else {
                result.push({
                    path,
                    value,
                });
            }
        }

        return result;
    }

    _formatValue(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not provided";
        }

        if (Array.isArray(value)) {
            return value.length
                ? value.join(", ")
                : "Not provided";
        }

        if (
            typeof value === "boolean"
        ) {
            return value
                ? "Yes"
                : "No";
        }

        return String(value);
    }

    _humanisePath(path) {
        return String(path)
            .split(".")
            .pop()
            .replace(
                /([A-Z])/g,
                " $1"
            )
            .replace(
                /^./,
                (value) =>
                    value.toUpperCase()
            );
    }
}

export default ConsultationReview;
