export type BunproErrorCode =
  | "BUNPRO_CONFIG_MISSING"
  | "BUNPRO_ACCOUNT_NOT_LINKED"
  | "BUNPRO_AUTH_FAILED"
  | "BUNPRO_CONTRACT_CHANGED"
  | "BUNPRO_UPSTREAM_UNAVAILABLE";

export class BunproError extends Error {
  readonly code: BunproErrorCode;

  constructor(code: BunproErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BunproError";
    this.code = code;
  }
}

export class BunproAccountNotLinkedError extends BunproError {
  readonly setupUrl: string;

  constructor(setupUrl: string) {
    super(
      "BUNPRO_ACCOUNT_NOT_LINKED",
      "This identity has not linked a Bunpro account yet. Open the setup URL to connect one."
    );
    this.name = "BunproAccountNotLinkedError";
    this.setupUrl = setupUrl;
  }
}

export function connectionErrorMessage(error: unknown): string {
  if (error instanceof BunproError) {
    return `${error.code}: ${error.message}`;
  }

  return "BUNPRO_UPSTREAM_UNAVAILABLE: Bunpro could not be reached. Try the connection check again later.";
}
