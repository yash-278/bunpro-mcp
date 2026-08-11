import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier
} from "@modelcontextprotocol/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export class JwtTokenVerifier implements OAuthTokenVerifier {
  readonly #issuer: string;
  readonly #audience: string;
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(issuerUrl: URL, audience: string) {
    this.#issuer = issuerUrl.href;
    this.#audience = audience;
    this.#jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuerUrl));
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const { payload } = await jwtVerify(token, this.#jwks, {
        issuer: this.#issuer,
        audience: this.#audience
      });
      return authInfoFromPayload(token, payload, this.#audience);
    } catch (error) {
      if (error instanceof OAuthError) throw error;
      throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token is invalid or expired.");
    }
  }
}

function authInfoFromPayload(token: string, payload: JWTPayload, audience: string): AuthInfo {
  const subject = payload.sub;
  const issuer = payload.iss;
  const expiresAt = payload.exp;
  const clientId = stringClaim(payload.azp) ?? stringClaim(payload.client_id);
  if (!subject || !issuer || !expiresAt || !clientId) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token is missing required claims.");
  }

  const scopes = new Set<string>();
  if (typeof payload.scope === "string") {
    for (const scope of payload.scope.split(/\s+/)) if (scope) scopes.add(scope);
  }
  if (Array.isArray(payload.permissions)) {
    for (const permission of payload.permissions) if (typeof permission === "string") scopes.add(permission);
  }

  return {
    token,
    clientId,
    scopes: [...scopes],
    expiresAt,
    resource: new URL(audience),
    extra: { subject, issuer }
  };
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
