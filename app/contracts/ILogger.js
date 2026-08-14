/**
 * Isaacs and Partners
 * Contract: Logger
 */

export class ILogger {
  debug(message, metadata = {}) {
    throw new Error(
      "ILogger.debug() must be implemented."
    );
  }

  info(message, metadata = {}) {
    throw new Error(
      "ILogger.info() must be implemented."
    );
  }

  warn(message, metadata = {}) {
    throw new Error(
      "ILogger.warn() must be implemented."
    );
  }

  error(message, metadata = {}) {
    throw new Error(
      "ILogger.error() must be implemented."
    );
  }

  audit(message, metadata = {}) {
    throw new Error(
      "ILogger.audit() must be implemented."
    );
  }
}

export default ILogger;
