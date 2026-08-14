/**
 * Isaacs and Partners
 * Contract: Engine
 */

export class IEngine {
  initialise(context = {}) {
    throw new Error(
      "IEngine.initialise() must be implemented."
    );
  }

  execute(input, context = {}) {
    throw new Error(
      "IEngine.execute() must be implemented."
    );
  }

  validate(input, context = {}) {
    throw new Error(
      "IEngine.validate() must be implemented."
    );
  }

  reset() {
    throw new Error(
      "IEngine.reset() must be implemented."
    );
  }
}

export default IEngine;
