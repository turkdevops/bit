import { BitError } from 'bit-bin/dist/error/bit-error';

export class CannotLoadExtension extends BitError {
  constructor(private extensionName: string, private error: Error) {
    super(`could not load extension: ${extensionName}. `);
  }

  report(verbose?: boolean) {
    if (verbose) return `could not load extension: ${this.extensionName}. ${this.error} `;
    return this.message;
  }

  toJson() {}
}
