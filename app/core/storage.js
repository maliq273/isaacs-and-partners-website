/**
 * Isaacs and Partners
 * Core Storage Facade
 *
 * Provides a stable interface to the application's
 * existing storage layer without coupling the core
 * runtime to a specific storage implementation.
 */

class CoreStorage {
  constructor() {
    this.provider = null;
    this.initialised = false;
  }

  /**
   * Attach an existing storage provider.
   *
   * The provider may expose:
   * - initialise/init
   * - get
   * - set
   * - remove/delete
   * - clear
   */
  configure(provider) {
    if (!provider) {
      throw new TypeError(
        "Storage provider is required."
      );
    }

    this.provider = provider;

    return this;
  }

  async initialise() {
    if (this.initialised) {
      return this;
    }

    if (!this.provider) {
      this.provider =
        this._createDefaultProvider();
    }

    if (
      typeof this.provider.initialise ===
      "function"
    ) {
      await this.provider.initialise();
    } else if (
      typeof this.provider.init ===
      "function"
    ) {
      await this.provider.init();
    }

    this.initialised = true;

    return this;
  }

  async init() {
    return this.initialise();
  }

  async get(
    key,
    defaultValue = null
  ) {
    this._assertProvider();

    let value;

    if (
      typeof this.provider.get ===
      "function"
    ) {
      value =
        await this.provider.get(key);
    } else {
      throw new Error(
        "Configured storage provider does not implement get()."
      );
    }

    return value === undefined ||
      value === null
      ? defaultValue
      : value;
  }

  async set(key, value) {
    this._assertProvider();

    if (
      typeof this.provider.set !==
      "function"
    ) {
      throw new Error(
        "Configured storage provider does not implement set()."
      );
    }

    return this.provider.set(
      key,
      value
    );
  }

  async remove(key) {
    this._assertProvider();

    if (
      typeof this.provider.remove ===
      "function"
    ) {
      return this.provider.remove(key);
    }

    if (
      typeof this.provider.delete ===
      "function"
    ) {
      return this.provider.delete(key);
    }

    throw new Error(
      "Configured storage provider does not implement remove() or delete()."
    );
  }

  async clear() {
    this._assertProvider();

    if (
      typeof this.provider.clear !==
      "function"
    ) {
      throw new Error(
        "Configured storage provider does not implement clear()."
      );
    }

    return this.provider.clear();
  }

  async has(key) {
    this._assertProvider();

    if (
      typeof this.provider.has ===
      "function"
    ) {
      return Boolean(
        await this.provider.has(key)
      );
    }

    const value =
      await this.get(
        key,
        Symbol.for("missing")
      );

    return (
      value !==
      Symbol.for("missing")
    );
  }

  getProvider() {
    return this.provider;
  }

  _assertProvider() {
    if (!this.provider) {
      throw new Error(
        "Storage provider has not been configured."
      );
    }
  }

  _createDefaultProvider() {
    if (
      typeof window === "undefined"
    ) {
      return new MemoryStorageProvider();
    }

    return new BrowserStorageProvider();
  }
}

/**
 * Browser localStorage fallback.
 *
 * This is deliberately isolated behind the CoreStorage
 * facade so it can later be replaced by the application's
 * existing StorageFactory/StorageProvider implementation.
 */
class BrowserStorageProvider {
  async initialise() {
    return this;
  }

  async get(key) {
    const raw =
      window.localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async set(key, value) {
    window.localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return value;
  }

  async remove(key) {
    window.localStorage.removeItem(key);
  }

  async delete(key) {
    return this.remove(key);
  }

  async clear() {
    window.localStorage.clear();
  }

  async has(key) {
    return (
      window.localStorage.getItem(key) !==
      null
    );
  }
}

/**
 * Memory fallback for non-browser execution.
 */
class MemoryStorageProvider {
  constructor() {
    this.values = new Map();
  }

  async initialise() {
    return this;
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
    return value;
  }

  async remove(key) {
    this.values.delete(key);
  }

  async delete(key) {
    return this.remove(key);
  }

  async clear() {
    this.values.clear();
  }

  async has(key) {
    return this.values.has(key);
  }
}

export const storage =
  new CoreStorage();

export {
  CoreStorage,
  BrowserStorageProvider,
  MemoryStorageProvider,
};

export default storage;
