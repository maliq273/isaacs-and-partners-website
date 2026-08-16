/**
 * Isaacs and Partners
 * Core Storage Facade
 *
 * Stable interface to the application's storage layer.
 *
 * The core runtime must NOT depend directly on Supabase,
 * SQLite, IndexedDB or localStorage.
 *
 * Those implementations belong behind the storage provider
 * abstraction.
 */

class CoreStorage {
  constructor() {
    this.provider = null;
    this.initialised = false;
  }

  /**
   * Attach a storage provider.
   */
  configure(provider) {
    if (!provider) {
      throw new TypeError(
        "Storage provider is required."
      );
    }

    if (
      typeof provider !== "object" &&
      typeof provider !== "function"
    ) {
      throw new TypeError(
        "Storage provider must be an object."
      );
    }

    this.provider =
      provider;

    /*
     * A newly configured provider may not have been
     * initialised yet.
     */
    this.initialised =
      false;

    return this;
  }

  /**
   * Initialise storage provider.
   */
  async initialise() {
    if (
      this.initialised
    ) {
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

    this.initialised =
      true;

    return this;
  }

  async init() {
    return this.initialise();
  }

  /**
   * Get stored value.
   */
  async get(
    key,
    defaultValue = null
  ) {
    this._assertProvider();

    if (
      typeof this.provider.get !==
      "function"
    ) {
      throw new Error(
        "Configured storage provider does not implement get()."
      );
    }

    const value =
      await this.provider.get(
        key
      );

    return (
      value === undefined ||
      value === null
    )
      ? defaultValue
      : value;
  }

  /**
   * Set stored value.
   */
  async set(
    key,
    value
  ) {
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

  /**
   * Remove stored value.
   */
  async remove(key) {
    this._assertProvider();

    if (
      typeof this.provider.remove ===
      "function"
    ) {
      return this.provider.remove(
        key
      );
    }

    if (
      typeof this.provider.delete ===
      "function"
    ) {
      return this.provider.delete(
        key
      );
    }

    throw new Error(
      "Configured storage provider does not implement remove() or delete()."
    );
  }

  /**
   * Alias for remove().
   */
  async delete(key) {
    return this.remove(
      key
    );
  }

  /**
   * Clear storage.
   */
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

  /**
   * Determine whether a key exists.
   */
  async has(key) {
    this._assertProvider();

    if (
      typeof this.provider.has ===
      "function"
    ) {
      return Boolean(
        await this.provider.has(
          key
        )
      );
    }

    const missing =
      Symbol.for(
        "storage.missing"
      );

    const value =
      await this.get(
        key,
        missing
      );

    return (
      value !== missing
    );
  }

  /**
   * Return configured provider.
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Return provider status.
   */
  getStatus() {
    return {
      configured:
        Boolean(
          this.provider
        ),
      initialised:
        this.initialised,
      provider:
        this.provider?.constructor
          ?.name || null,
    };
  }

  /**
   * Reset facade without destroying provider data.
   */
  reset() {
    this.initialised =
      false;

    return this;
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
      typeof window ===
      "undefined"
    ) {
      return new MemoryStorageProvider();
    }

    return new BrowserStorageProvider();
  }
}

/**
 * Browser localStorage fallback.
 *
 * This is only the emergency/default provider.
 *
 * Production persistence should be supplied through
 * the application's StorageFactory.
 */
class BrowserStorageProvider {
  async initialise() {
    return this;
  }

  async init() {
    return this.initialise();
  }

  async get(key) {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (
      raw === null
    ) {
      return null;
    }

    try {
      return JSON.parse(
        raw
      );
    } catch {
      return raw;
    }
  }

  async set(
    key,
    value
  ) {
    window.localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return value;
  }

  async remove(key) {
    window.localStorage.removeItem(
      key
    );
  }

  async delete(key) {
    return this.remove(
      key
    );
  }

  async clear() {
    window.localStorage.clear();
  }

  async has(key) {
    return (
      window.localStorage.getItem(
        key
      ) !== null
    );
  }
}

/**
 * Memory fallback for non-browser execution.
 */
class MemoryStorageProvider {
  constructor() {
    this.values =
      new Map();
  }

  async initialise() {
    return this;
  }

  async init() {
    return this.initialise();
  }

  async get(key) {
    return (
      this.values.get(key) ??
      null
    );
  }

  async set(
    key,
    value
  ) {
    this.values.set(
      key,
      value
    );

    return value;
  }

  async remove(key) {
    this.values.delete(
      key
    );
  }

  async delete(key) {
    return this.remove(
      key
    );
  }

  async clear() {
    this.values.clear();
  }

  async has(key) {
    return this.values.has(
      key
    );
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
