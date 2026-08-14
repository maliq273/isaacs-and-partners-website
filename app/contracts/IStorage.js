/**
 * Isaacs and Partners
 * Contract: Storage
 */

export class IStorage {
  initialise() {
    throw new Error(
      "IStorage.initialise() must be implemented."
    );
  }

  get(key, defaultValue = null) {
    throw new Error(
      "IStorage.get() must be implemented."
    );
  }

  set(key, value) {
    throw new Error(
      "IStorage.set() must be implemented."
    );
  }

  remove(key) {
    throw new Error(
      "IStorage.remove() must be implemented."
    );
  }

  has(key) {
    throw new Error(
      "IStorage.has() must be implemented."
    );
  }

  clear() {
    throw new Error(
      "IStorage.clear() must be implemented."
    );
  }

  transaction(callback) {
    throw new Error(
      "IStorage.transaction() must be implemented."
    );
  }
}

export default IStorage;
