/**
 * Isaacs and Partners
 * Contract: Service
 */

export class IService {
  initialise(context = {}) {
    throw new Error(
      "IService.initialise() must be implemented."
    );
  }

  create(data, context = {}) {
    throw new Error(
      "IService.create() must be implemented."
    );
  }

  get(id, context = {}) {
    throw new Error(
      "IService.get() must be implemented."
    );
  }

  update(id, data, context = {}) {
    throw new Error(
      "IService.update() must be implemented."
    );
  }

  delete(id, context = {}) {
    throw new Error(
      "IService.delete() must be implemented."
    );
  }

  list(filters = {}, context = {}) {
    throw new Error(
      "IService.list() must be implemented."
    );
  }
}

export default IService;
