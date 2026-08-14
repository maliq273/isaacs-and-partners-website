/**
 * Isaacs and Partners
 * Contract: Authorization
 */

export class IAuthorization {
  can(user, action, resource = null) {
    throw new Error(
      "IAuthorization.can() must be implemented."
    );
  }

  cannot(user, action, resource = null) {
    throw new Error(
      "IAuthorization.cannot() must be implemented."
    );
  }

  authorize(user, action, resource = null) {
    throw new Error(
      "IAuthorization.authorize() must be implemented."
    );
  }

  getPermissions(user) {
    throw new Error(
      "IAuthorization.getPermissions() must be implemented."
    );
  }
}

export default IAuthorization;
