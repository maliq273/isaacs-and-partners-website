/**
 * Isaacs and Partners
 * Contract: Builder
 */

export class IBuilder {
  reset() {
    throw new Error(
      "IBuilder.reset() must be implemented."
    );
  }

  build() {
    throw new Error(
      "IBuilder.build() must be implemented."
    );
  }
}

export default IBuilder;
