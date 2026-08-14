/**
 * Isaacs and Partners
 * Consultation Wizard
 *
 * Main controller for the consultation workflow.
 */

import {
    getQuestions,
} from "./questions.js";

import {
    CONSULTATION_STEPS,
    getStepByNumber,
} from "./steps.js";

import ConsultationReview from "./review.js";
import ConsultationSummary from "./summary.js";

class ConsultationWizard {
    constructor() {
        this.form =
            document.getElementById(
                "consultation-form"
            );

        this.stepContainer =
            document.getElementById(
                "consultation-step"
            );

        this.alert =
            document.getElementById(
                "consultation-alert"
            );

        this.backButton =
            document.getElementById(
                "consultation-back"
            );

        this.nextButton =
            document.getElementById(
                "consultation-next"
            );

        this.saveButton =
            document.getElementById(
                "consultation-save"
            );

        this.submitButton =
            document.getElementById(
                "consultation-submit"
            );

        this.status =
            document.getElementById(
                "consultation-status"
            );

        this.progress =
            document.querySelectorAll(
                ".progress-step"
            );

        this.currentStep = 1;

        this.data = {
            client: {},
            matter: {},
            consent: {},
        };

        this.questions =
            getQuestions();

        this.review =
            new ConsultationReview({
                container:
                    this.stepContainer,
                onEdit: () =>
                    this.goTo(1),
            });

        this.summary =
            new ConsultationSummary({
                container:
                    this.stepContainer,
            });
    }

    async initialise() {
        this._loadSavedData();
        this._bindEvents();
        this.render();

        return this;
    }

    render() {
        this._updateProgress();
        this._updateActions();

        switch (this.currentStep) {
            case 1:
                this._renderQuestions();
                break;

            case 2:
                this.review.render(
                    this.data
                );
                break;

            case 3:
                this._renderAssessment();
                break;

            case 4:
                this.summary.render(
                    this._buildSummary()
                );
                break;

            case 5:
                this._renderComplete();
                break;

            default:
                this.currentStep = 1;
                this.render();
        }
    }

    async next() {
        this.clearAlert();

        if (
            this.currentStep === 1
        ) {
            if (!this._captureQuestions()) {
                return;
            }
        }

        if (
            this.currentStep === 2
        ) {
            this._saveData();
        }

        if (
            this.currentStep <
            CONSULTATION_STEPS.length
        ) {
            this.currentStep += 1;
            this.render();
        }
    }

    previous() {
        this.clearAlert();

        if (this.currentStep <= 1) {
            return;
        }

        this.currentStep -= 1;
        this.render();
    }

    goTo(stepNumber) {
        if (
            stepNumber < 1 ||
            stepNumber >
                CONSULTATION_STEPS.length
        ) {
            return;
        }

        this.currentStep =
            stepNumber;

        this.render();
    }

    async save() {
        this._captureQuestions();
        this._saveData();

        this.showAlert(
            "Your consultation information has been saved locally. You may return to continue.",
            "success"
        );
    }

    async submit() {
        this.clearAlert();

        if (
            !this._captureQuestions()
        ) {
            this.currentStep = 1;
            this.render();
            return;
        }

        this._saveData();

        /*
         * The production API/service layer can be connected here
         * without changing the consultation UI contract.
         *
         * Expected future integration:
         *
         * consultation.service.js
         * -> ConsultationService.submit()
         * -> MatterService / ClientService
         * -> API/storage layer
         */

        this.currentStep = 5;
        this.render();
    }

    _renderQuestions() {
        this.stepContainer.innerHTML = `
            <section>
                <header>
                    <h2>Tell us about your matter</h2>

                    <p>
                        Please answer all applicable questions
                        accurately. The information will be used
                        for the preliminary assessment.
                    </p>
                </header>

                <div
                    id="consultation-question-list"
                    class="consultation-question-list"
                ></div>
            </section>
        `;

        const list =
            document.getElementById(
                "consultation-question-list"
            );

        for (const question of this.questions) {
            list.append(
                this._createQuestion(
                    question
                )
            );
        }
    }

    _createQuestion(question) {
        const wrapper =
            document.createElement("div");

        wrapper.className =
            "form-field consultation-question";

        wrapper.dataset.questionId =
            question.id;

        const label =
            document.createElement("label");

        label.htmlFor =
            `question-${this._fieldId(
                question.id
            )}`;

        label.textContent =
            question.label;

        wrapper.append(label);

        if (question.description) {
            const description =
                document.createElement("small");

            description.textContent =
                question.description;

            wrapper.append(description);
        }

        const existingValue =
            this._getValue(
                question.id
            );

        if (
            question.type === "select"
        ) {
            const select =
                document.createElement("select");

            select.id =
                `question-${this._fieldId(
                    question.id
                )}`;

            select.name =
                question.id;

            this._addEmptyOption(
                select
            );

            for (
                const option
                of question.options || []
            ) {
                const element =
                    document.createElement(
                        "option"
                    );

                element.value =
                    option.value;

                element.textContent =
                    option.label;

                if (
                    existingValue ===
                    option.value
                ) {
                    element.selected = true;
                }

                select.append(element);
            }

            wrapper.append(select);
        } else if (
            question.type === "radio"
        ) {
            const group =
                document.createElement(
                    "div"
                );

            group.className =
                "radio-group";

            for (
                const option
                of question.options || []
            ) {
                const item =
                    document.createElement(
                        "label"
                    );

                const input =
                    document.createElement(
                        "input"
                    );

                input.type = "radio";
                input.name =
                    question.id;
                input.value =
                    option.value;

                input.checked =
                    existingValue ===
                    option.value;

                item.append(
                    input,
                    document.createTextNode(
                        ` ${option.label}`
                    )
                );

                group.append(item);
            }

            wrapper.append(group);
        } else if (
            question.type === "checkbox"
        ) {
            const checkbox =
                document.createElement(
                    "input"
                );

            checkbox.type = "checkbox";
            checkbox.id =
                `question-${this._fieldId(
                    question.id
                )}`;

            checkbox.name =
                question.id;

            checkbox.checked =
                existingValue === true;

            label.htmlFor =
                checkbox.id;

            wrapper.innerHTML = "";
            wrapper.append(
                checkbox,
                document.createTextNode(
                    ` ${question.label}`
                )
            );
        } else {
            const input =
                document.createElement(
                    question.type === "textarea"
                        ? "textarea"
                        : "input"
                );

            input.id =
                `question-${this._fieldId(
                    question.id
                )}`;

            input.name =
                question.id;

            if (
                question.type !==
                "textarea"
            ) {
                input.type =
                    question.type;
            }

            if (question.placeholder) {
                input.placeholder =
                    question.placeholder;
            }

            if (
                question.type ===
                "textarea"
            ) {
                input.rows = 5;
            }

            if (
                existingValue !==
                    null &&
                existingValue !==
                    undefined
            ) {
                input.value =
                    existingValue;
            }

            wrapper.append(input);
        }

        const error =
            document.createElement("small");

        error.className =
            "field-error";

        error.dataset.errorFor =
            question.id;

        error.hidden = true;

        wrapper.append(error);

        return wrapper;
    }

    _renderAssessment() {
        const category =
            this._getValue(
                "matter.category"
            );

        const description =
            this._getValue(
                "matter.description"
            );

        this.stepContainer.innerHTML = `
            <section class="consultation-assessment">

                <header>
                    <h2>
                        Preliminary Assessment
                    </h2>

                    <p>
                        The consultation information is now
                        ready for assessment.
                    </p>
                </header>

                <div class="assessment-card">

                    <h3>
                        Matter Category
                    </h3>

                    <p>
                        ${this._escape(
                            this._formatCategory(
                                category
                            )
                        )}
                    </p>

                </div>

                <div class="assessment-card">

                    <h3>
                        Matter Description
                    </h3>

                    <p>
                        ${this._escape(
                            description ||
                            "No description supplied."
                        )}
                    </p>

                </div>

                <div class="assessment-card">

                    <h3>
                        Next Step
                    </h3>

                    <p>
                        Continue to review the preliminary
                        consultation information.
                    </p>

                </div>

            </section>
        `;
    }

    _renderComplete() {
        this.stepContainer.innerHTML = `
            <section
                class="consultation-complete"
                aria-live="polite"
            >

                <h2>
                    Consultation Submitted
                </h2>

                <p>
                    Your consultation information has been
                    recorded successfully.
                </p>

                <p>
                    Isaacs and Partners can now review the
                    information and determine the appropriate
                    next step.
                </p>

            </section>
        `;
    }

    _captureQuestions() {
        let valid = true;

        for (const question of this.questions) {
            const value =
                this._readQuestionValue(
                    question
                );

            const error =
                this._validateQuestion(
                    question,
                    value
                );

            this._setValue(
                question.id,
                value
            );

            this._displayFieldError(
                question.id,
                error
            );

            if (error) {
                valid = false;
            }
        }

        if (!valid) {
            this.showAlert(
                "Please correct the highlighted information before continuing.",
                "error"
            );
        }

        return valid;
    }

    _readQuestionValue(question) {
        const selector =
            `[name="${CSS.escape(
                question.id
            )}"]`;

        if (
            question.type === "radio"
        ) {
            const selected =
                document.querySelector(
                    `${selector}:checked`
                );

            return selected
                ? selected.value
                : "";
        }

        const field =
            document.querySelector(
                selector
            );

        if (!field) {
            return null;
        }

        if (
            question.type ===
            "checkbox"
        ) {
            return field.checked;
        }

        return field.value.trim();
    }

    _validateQuestion(
        question,
        value
    ) {
        const rule =
            question.validation;

        if (!rule) {
            return null;
        }

        if (
            rule.required &&
            (
                value === "" ||
                value === null ||
                value === undefined ||
                value === false
            )
        ) {
            return (
                rule.message ||
                "This field is required."
            );
        }

        if (
            rule.minLength &&
            String(value).length <
                rule.minLength
        ) {
            return (
                rule.message ||
                `Please enter at least ${rule.minLength} characters.`
            );
        }

        if (
            rule.pattern &&
            value &&
            !rule.pattern.test(
                String(value)
            )
        ) {
            return (
                rule.message ||
                "Please enter a valid value."
            );
        }

        return null;
    }

    _displayFieldError(
        questionId,
        message
    ) {
        const error =
            document.querySelector(
                `[data-error-for="${CSS.escape(
                    questionId
                )}"]`
            );

        if (!error) {
            return;
        }

        error.textContent =
            message || "";

        error.hidden =
            !Boolean(message);
    }

    _updateProgress() {
        const step =
            getStepByNumber(
                this.currentStep
            );

        if (this.status && step) {
            this.status.textContent =
                `Step ${step.number} of ${CONSULTATION_STEPS.length}`;
        }

        this.progress.forEach(
            (element) => {
                const number =
                    Number(
                        element.dataset.step
                    );

                element.classList.toggle(
                    "is-active",
                    number ===
                        this.currentStep
                );

                element.classList.toggle(
                    "is-complete",
                    number <
                        this.currentStep
                );
            }
        );
    }

    _updateActions() {
        const first =
            this.currentStep === 1;

        const last =
            this.currentStep ===
            CONSULTATION_STEPS.length;

        const beforeSubmit =
            this.currentStep === 4;

        this.backButton.hidden =
            first || last;

        this.nextButton.hidden =
            last || beforeSubmit;

        this.submitButton.hidden =
            !beforeSubmit;

        this.saveButton.hidden =
            last;
    }

    _buildSummary() {
        return {
            outcome:
                "consultation_required",

            title:
                "Further Professional Assessment Recommended",

            description:
                "The information supplied has been captured. A professional review is recommended before a final course of action is determined.",

            recommendedServices: [
                this._formatCategory(
                    this._getValue(
                        "matter.category"
                    )
                ),
            ],

            outstandingDocuments: [],
        };
    }

    _saveData() {
        try {
            window.localStorage.setItem(
                "isaacs_partners_consultation",
                JSON.stringify(
                    this.data
                )
            );
        } catch (error) {
            console.warn(
                "[Consultation] Local save failed:",
                error
            );
        }
    }

    _loadSavedData() {
        try {
            const raw =
                window.localStorage.getItem(
                    "isaacs_partners_consultation"
                );

            if (!raw) {
                return;
            }

            const parsed =
                JSON.parse(raw);

            if (
                parsed &&
                typeof parsed === "object"
            ) {
                this.data = {
                    ...this.data,
                    ...parsed,
                };
            }
        } catch (error) {
            console.warn(
                "[Consultation] Saved consultation could not be loaded:",
                error
            );
        }
    }

    _bindEvents() {
        this.backButton?.addEventListener(
            "click",
            () => this.previous()
        );

        this.nextButton?.addEventListener(
            "click",
            () => this.next()
        );

        this.saveButton?.addEventListener(
            "click",
            () => this.save()
        );

        this.submitButton?.addEventListener(
            "click",
            () => this.submit()
        );

        this.form?.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();
                this.submit();
            }
        );
    }

    _getValue(path) {
        const parts =
            path.split(".");

        let current =
            this.data;

        for (const part of parts) {
            if (
                current === null ||
                current === undefined
            ) {
                return null;
            }

            current = current[part];
        }

        return current ?? null;
    }

    _setValue(path, value) {
        const parts =
            path.split(".");

        let current =
            this.data;

        for (
            let index = 0;
            index < parts.length - 1;
            index += 1
        ) {
            const part =
                parts[index];

            if (
                !current[part] ||
                typeof current[part] !==
                    "object"
            ) {
                current[part] = {};
            }

            current =
                current[part];
        }

        current[
            parts[parts.length - 1]
        ] = value;
    }

    _fieldId(value) {
        return String(value)
            .replace(/[^a-zA-Z0-9_-]/g, "-");
    }

    _addEmptyOption(select) {
        const option =
            document.createElement(
                "option"
            );

        option.value = "";
        option.textContent =
            "Please select...";
        option.disabled = true;

        if (!select.value) {
            option.selected = true;
        }

        select.append(option);
    }

    _formatCategory(category) {
        const labels = {
            immigration:
                "Immigration Services",
            hr:
                "HR & Industrial Relations",
            business:
                "Business Compliance",
            legal:
                "Legal Services",
        };

        return (
            labels[category] ||
            "Not specified"
        );
    }

    _escape(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    showAlert(
        message,
        type = "error"
    ) {
        if (!this.alert) {
            return;
        }

        this.alert.hidden = false;
        this.alert.textContent =
            message;

        this.alert.dataset.type =
            type;
    }

    clearAlert() {
        if (!this.alert) {
            return;
        }

        this.alert.hidden = true;
        this.alert.textContent = "";
        delete this.alert.dataset.type;
    }
}

const wizard =
    new ConsultationWizard();

if (
    typeof document !== "undefined"
) {
    wizard
        .initialise()
        .catch((error) => {
            console.error(
                "[Consultation] Failed to initialise:",
                error
            );

            wizard.showAlert(
                "The consultation could not be loaded. Please reload the page.",
                "error"
            );
        });
}

export {
    ConsultationWizard,
};

export default wizard;
