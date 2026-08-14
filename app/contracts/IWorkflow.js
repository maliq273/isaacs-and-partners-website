/**
 * Isaacs and Partners
 * Contract: Workflow
 */

export class IWorkflow {
  initialise(context = {}) {
    throw new Error(
      "IWorkflow.initialise() must be implemented."
    );
  }

  start(context = {}) {
    throw new Error(
      "IWorkflow.start() must be implemented."
    );
  }

  execute(input, context = {}) {
    throw new Error(
      "IWorkflow.execute() must be implemented."
    );
  }

  pause(context = {}) {
    throw new Error(
      "IWorkflow.pause() must be implemented."
    );
  }

  resume(context = {}) {
    throw new Error(
      "IWorkflow.resume() must be implemented."
    );
  }

  cancel(context = {}) {
    throw new Error(
      "IWorkflow.cancel() must be implemented."
    );
  }

  complete(result = null, context = {}) {
    throw new Error(
      "IWorkflow.complete() must be implemented."
    );
  }

  getStatus() {
    throw new Error(
      "IWorkflow.getStatus() must be implemented."
    );
  }
}

export default IWorkflow;
