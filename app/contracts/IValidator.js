/**
 * Isaacs and Partners
 * Contract: Validator
 */

export class IValidator {
  validate(data, context = {}) {
    throw new Error(
      "IValidator.validate() must be implemented."
    );
  }

  isValid(data, context = {}) {
    throw new Error(
      "IValidator.isValid() must be implemented."
    );
  }

  getErrors() {
    throw new Error(
      "IValidator.getErrors() must be implemented."
    );
  }

  clearErrors() {
    throw new Error(
      "IValidator.clearErrors() must be implemented."
    );
  }
}

export default IValidator;
