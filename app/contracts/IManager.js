/**
 * Isaacs and Partners
 * Contract: Manager
 */

export class IManager {
  create(data) {
    throw new Error(
      "IManager.create() must be implemented."
    );
  }

  get(id) {
    throw new Error(
      "IManager.get() must be implemented."
    );
  }

  update(id, data) {
    throw new Error(
      "IManager.update() must be implemented."
    );
  }

  delete(id) {
    throw new Error(
      "IManager.delete() must be implemented."
    );
  }

  list(filters = {}) {
    throw new Error(
      "IManager.list() must be implemented."
    );
  }
}

export default IManager;
