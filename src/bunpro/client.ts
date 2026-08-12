import { BunproError } from "./errors.js";
import {
  BunproUserResponseSchema,
  type ConnectionStatus,
  type TokenSource
} from "./schemas.js";

const API_ORIGIN = "https://api.bunpro.jp";
const FRONTEND_API_PREFIX = "/api/frontend/";
const ACCOUNT_TOKEN_OPT_IN = "dangerously_authenticate_using_api_token";
const REQUEST_TIMEOUT_MS = 20_000;

export interface BunproClientOptions {
  tokenSource?: TokenSource;
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

  constructor(
    apiToken: string,
    fetchImplementation: FetchLike = fetch,
    options: BunproClientOptions = {}
  ) {
    this.#apiToken = validateApiToken(apiToken);
    this.#fetch = fetchImplementation;
    this.#tokenSource = options.tokenSource ?? "environment";
  }

  async checkConnection(): Promise<ConnectionStatus> {
    const payload = await this.getFrontendJson("/api/frontend/user");
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

  async getFrontendJson(path: string): Promise<unknown> {
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
      return await this.#fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
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
      return await response.json();
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
