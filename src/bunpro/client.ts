import { BunproError } from "./errors.js";
import {
  BunproUserResponseSchema,
  type ConnectionStatus,
  type TokenSource
} from "./schemas.js";

const API_ORIGIN = "https://api.bunpro.jp";
const FRONTEND_API_PREFIX = "/api/frontend/";
const ACCOUNT_TOKEN_OPT_IN = "dangerously_authenticate_using_api_token";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export interface BunproRequestGateOptions {
  maximumConcurrent: number;
  maximumQueued: number;
}

export class BunproRequestGate {
  readonly #maximumConcurrent: number;
  readonly #maximumQueued: number;
  readonly #queue: Array<() => void> = [];
  #active = 0;

  constructor(options: BunproRequestGateOptions) {
    if (!Number.isInteger(options.maximumConcurrent) || options.maximumConcurrent < 1) {
      throw new TypeError("maximumConcurrent must be a positive integer.");
    }
    if (!Number.isInteger(options.maximumQueued) || options.maximumQueued < 0) {
      throw new TypeError("maximumQueued must be a non-negative integer.");
    }
    this.#maximumConcurrent = options.maximumConcurrent;
    this.#maximumQueued = options.maximumQueued;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#active >= this.#maximumConcurrent) {
      if (this.#queue.length >= this.#maximumQueued) {
        throw new BunproError(
          "BUNPRO_BUSY",
          "The Bunpro request budget is currently full. Wait briefly before trying again."
        );
      }
      await new Promise<void>(resolve => this.#queue.push(resolve));
    }

    this.#active += 1;
    try {
      return await operation();
    } finally {
      this.#active -= 1;
      this.#queue.shift()?.();
    }
  }
}

export interface BunproClientOptions {
  tokenSource?: TokenSource;
  requestGate?: BunproRequestGate;
  requestTimeoutMs?: number;
  maximumResponseBytes?: number;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function apiTokenFromEnvironment(environment: NodeJS.ProcessEnv = process.env): string {
  const token = environment.BUNPRO_API_TOKEN?.trim();
  if (!token) {
    throw new BunproError(
      "BUNPRO_CONFIG_MISSING",
      "Set BUNPRO_API_TOKEN in the MCP host's secret environment configuration."
    );
  }
  return validateApiToken(token);
}

export class BunproClient {
  readonly #apiToken: string;
  readonly #fetch: FetchLike;
  readonly #tokenSource: TokenSource;
  readonly #requestGate: BunproRequestGate | undefined;
  readonly #requestTimeoutMs: number;
  readonly #maximumResponseBytes: number;

  constructor(
    apiToken: string,
    fetchImplementation: FetchLike = fetch,
    options: BunproClientOptions = {}
  ) {
    this.#apiToken = validateApiToken(apiToken);
    this.#fetch = fetchImplementation;
    this.#tokenSource = options.tokenSource ?? "environment";
    this.#requestGate = options.requestGate;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
    this.#maximumResponseBytes = options.maximumResponseBytes ?? MAX_RESPONSE_BYTES;
  }

  async checkConnection(operationSignal?: AbortSignal): Promise<ConnectionStatus> {
    const payload = await this.getFrontendJson("/api/frontend/user", operationSignal);
    const userPayload = BunproUserResponseSchema.safeParse(payload);
    if (!userPayload.success) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro accepted the Account API Token, but the user response shape changed. Update the MCP before using study data."
      );
    }

    return {
      connected: true,
      authentication_method: "account_api_token",
      token_source: this.#tokenSource,
      token_persisted_by_server: false,
      api_authenticated: true,
      source_timezone: userPayload.data.user.data.attributes.time_zone_iana,
      stateless: true
    };
  }

  async getFrontendJson(path: string, operationSignal?: AbortSignal): Promise<unknown> {
    const url = new URL(path, API_ORIGIN);
    if (url.origin !== API_ORIGIN || !url.pathname.startsWith(FRONTEND_API_PREFIX)) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "The Bunpro client only permits read-only Frontend API routes."
      );
    }
    url.searchParams.set(ACCOUNT_TOKEN_OPT_IN, "true");

    const response = await this.#request(url, {
      method: "GET",
      ...(operationSignal ? { signal: operationSignal } : {}),
      headers: {
        accept: "application/json",
        authorization: `Token token=${this.#apiToken}`,
        origin: "https://bunpro.jp",
        referer: "https://bunpro.jp/",
        "user-agent": "bunpro-mcp-server/0.1"
      }
    });

    this.#ensureApiSuccess(response);
    return this.#readJson(response);
  }

  #ensureApiSuccess(response: Response): void {
    if (response.status === 401 || response.status === 403) {
      throw new BunproError(
        "BUNPRO_AUTH_FAILED",
        "Bunpro rejected the Account API Token. Configure a current token from Bunpro Settings > API."
      );
    }

    if (response.status === 429) {
      throw new BunproError(
        "BUNPRO_RATE_LIMITED",
        "Bunpro rate-limited the request. Wait before trying again; the MCP will not retry automatically."
      );
    }

    if (response.status === 404) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "The Bunpro Frontend API route is unavailable. Bunpro may have changed or restricted its temporary route whitelist."
      );
    }

    if (!response.ok) {
      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        `Bunpro's frontend API returned HTTP ${response.status}. Try again later.`
      );
    }
  }

  async #request(url: URL, init: RequestInit): Promise<Response> {
    try {
      const requestTimeout = AbortSignal.timeout(this.#requestTimeoutMs);
      const request = (): Promise<Response> => this.#fetch(url, {
        ...init,
        signal: init.signal ? AbortSignal.any([init.signal, requestTimeout]) : requestTimeout
      });
      return await (this.#requestGate ? this.#requestGate.run(request) : request());
    } catch (error) {
      if (error instanceof BunproError) throw error;

      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        "Bunpro could not be reached before the request timeout. Try again later.",
        { cause: error }
      );
    }
  }

  async #readJson(response: Response): Promise<unknown> {
    try {
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > this.#maximumResponseBytes) {
        throw new RangeError("Bunpro response exceeds the configured byte limit.");
      }
      const body = await response.arrayBuffer();
      if (body.byteLength > this.#maximumResponseBytes) {
        throw new RangeError("Bunpro response exceeds the configured byte limit.");
      }
      return JSON.parse(new TextDecoder().decode(body));
    } catch (error) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro accepted the Account API Token, but the API response was not valid JSON.",
        { cause: error }
      );
    }
  }
}

function validateApiToken(token: string): string {
  const normalized = token.trim();
  if (!normalized || normalized.length > 2048 || /[\s\r\n]/.test(normalized)) {
    throw new BunproError(
      "BUNPRO_CONFIG_MISSING",
      "The Bunpro Account API Token is missing or malformed."
    );
  }
  return normalized;
}
