import { BunproError } from "./errors.js";
import { BunproUserResponseSchema, type ConnectionStatus } from "./schemas.js";

const WEB_ORIGIN = "https://bunpro.jp";
const API_ORIGIN = "https://api.bunpro.jp";
const REQUEST_TIMEOUT_MS = 20_000;

export interface BunproCredentials {
  username: string;
  password: string;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

class CookieJar {
  readonly #cookies = new Map<string, string>();

  absorb(headers: Headers): void {
    const setCookieHeaders = headers.getSetCookie();

    for (const header of setCookieHeaders) {
      const pair = header.split(";", 1)[0];
      if (!pair) continue;

      const separator = pair.indexOf("=");
      if (separator <= 0) continue;

      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1);
      this.#cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    return this.#cookies.get(name);
  }

  toRequestHeader(): string {
    return [...this.#cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

export function credentialsFromEnvironment(environment: NodeJS.ProcessEnv = process.env): BunproCredentials {
  const username = environment.BUNPRO_USERNAME ?? environment.BUNPRO_EMAIL;
  const password = environment.BUNPRO_PASSWORD;

  if (!username || !password) {
    throw new BunproError(
      "BUNPRO_CONFIG_MISSING",
      "Set BUNPRO_USERNAME (or BUNPRO_EMAIL) and BUNPRO_PASSWORD in the MCP host's secret environment configuration."
    );
  }

  return { username, password };
}

export class BunproClient {
  readonly #credentials: BunproCredentials;
  readonly #fetch: FetchLike;
  readonly #cookies = new CookieJar();
  #frontendToken: string | undefined;

  constructor(credentials: BunproCredentials, fetchImplementation: FetchLike = fetch) {
    this.#credentials = credentials;
    this.#fetch = fetchImplementation;
  }

  async checkConnection(): Promise<ConnectionStatus> {
    await this.#login();

    const accountResponse = await this.#webRequest("/settings/account");
    if (!accountResponse.ok) {
      throw new BunproError(
        "BUNPRO_AUTH_FAILED",
        "Bunpro created a login token but did not accept the authenticated web session. Check the account credentials."
      );
    }

    const userResponse = await this.#apiRequest("/api/frontend/user");
    const userPayload = BunproUserResponseSchema.safeParse(await this.#readJson(userResponse));
    if (!userPayload.success) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro authenticated successfully, but the user response shape changed. Update the MCP before using study data."
      );
    }

    return {
      connected: true,
      authentication_method: "frontend_session",
      credentials_source: "environment",
      web_session_authenticated: true,
      frontend_token_obtained: true,
      api_authenticated: true,
      source_timezone: userPayload.data.user.data.attributes.time_zone_iana,
      stateless: true
    };
  }

  async #login(): Promise<void> {
    const loginPage = await this.#webRequest("/login");
    if (!loginPage.ok) {
      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        `Bunpro's login page returned HTTP ${loginPage.status}. Try again later.`
      );
    }

    const authenticityToken = extractAuthenticityToken(await loginPage.text());
    const body = new URLSearchParams({
      authenticity_token: authenticityToken,
      "user[email]": this.#credentials.username,
      "user[password]": this.#credentials.password,
      "user[remember_me]": "0"
    });

    const signInResponse = await this.#webRequest("/users/sign_in", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual"
    });

    this.#frontendToken = this.#cookies.get("frontend_api_token");
    if (signInResponse.status < 300 || signInResponse.status >= 400 || !this.#frontendToken) {
      throw new BunproError(
        "BUNPRO_AUTH_FAILED",
        "Bunpro rejected the login or did not issue a frontend token. Check the credentials and any login challenge in Bunpro."
      );
    }
  }

  async #webRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json, text/html;q=0.9");
    headers.set("user-agent", "bunpro-mcp-server/0.1");

    const cookieHeader = this.#cookies.toRequestHeader();
    if (cookieHeader) headers.set("cookie", cookieHeader);

    const response = await this.#request(new URL(path, WEB_ORIGIN), {
      ...init,
      headers
    });
    this.#cookies.absorb(response.headers);
    return response;
  }

  async #apiRequest(path: string): Promise<Response> {
    if (!this.#frontendToken) {
      throw new BunproError("BUNPRO_AUTH_FAILED", "Bunpro API authentication was attempted before login completed.");
    }

    const response = await this.#request(new URL(path, API_ORIGIN), {
      headers: {
        accept: "application/json",
        authorization: `Token token=${this.#frontendToken}`,
        origin: WEB_ORIGIN,
        referer: `${WEB_ORIGIN}/`,
        "user-agent": "bunpro-mcp-server/0.1"
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new BunproError(
        "BUNPRO_AUTH_FAILED",
        "Bunpro issued a frontend token but rejected it at the API boundary. Try signing in again."
      );
    }

    if (!response.ok) {
      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        `Bunpro's frontend API returned HTTP ${response.status}. Try again later.`
      );
    }

    return response;
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
        "Bunpro authenticated successfully, but the API response was not valid JSON.",
        { cause: error }
      );
    }
  }
}

function extractAuthenticityToken(html: string): string {
  const match = html.match(/name=["']authenticity_token["'][^>]*value=["']([^"']+)["']/i);
  if (!match?.[1]) {
    throw new BunproError(
      "BUNPRO_CONTRACT_CHANGED",
      "Bunpro's login form no longer contains the expected authenticity token."
    );
  }

  return decodeHtmlEntities(match[1]);
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">"
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}
