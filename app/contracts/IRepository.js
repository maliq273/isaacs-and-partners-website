/**
 * Isaacs and Partners
 * Contract: Repository
 */

export class IRepository {
  findById(id) {
    throw new Error(
      "IRepository.findById() must be implemented."
    );
  }

  findOne(criteria = {}) {
    throw new Error(
      "IRepository.findOne() must be implemented."
    );
  }

  findMany(criteria = {}) {
    throw new Error(
      "IRepository.findMany() must be implemented."
    );
  }

  create(data) {
    throw new Error(
      "IRepository.create() must be implemented."
    );
  }

  update(id, data) {
    throw new Error(
      "IRepository.update() must be implemented."
    );
  }

  delete(id) {
    throw new Error(
      "IRepository.delete() must be implemented."
    );
  }

  count(criteria = {}) {
    throw new Error(
      "IRepository.count() must be implemented."
    );
  }

  exists(criteria = {}) {
    throw new Error(
      "IRepository.exists() must be implemented."
    );
  }
}

export default IRepository;
