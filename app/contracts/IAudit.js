/**
 * Isaacs and Partners
 * Contract: Audit
 *
 * Defines the minimum interface expected from an
 * audit implementation.
 */

export class IAudit {
  record(event) {
    throw new Error(
      "IAudit.record() must be implemented."
    );
  }

  log(action, context = {}) {
    throw new Error(
      "IAudit.log() must be implemented."
    );
  }

  query(filters = {}) {
    throw new Error(
      "IAudit.query() must be implemented."
    );
  }

  getById(id) {
    throw new Error(
      "IAudit.getById() must be implemented."
    );
  }
}

export default IAudit;
