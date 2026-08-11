export interface HttpConfig {
  port: number;
  publicBaseUrl: URL;
  mcpUrl: URL;
  authorizationServerUrl: URL;
  authAudience: string;
  authScope: string;
  databaseUrl: string;
  credentialsEncryptionKey: Buffer;
  setupTokenSecret: Buffer;
}

export function loadHttpConfig(environment: NodeJS.ProcessEnv = process.env): HttpConfig {
  const port = parsePort(environment.PORT);
  const publicBaseUrl = resolvePublicBaseUrl(environment);
  const mcpUrl = new URL("/mcp", publicBaseUrl);
  const authorizationServerUrl = requiredHttpsUrl(
    "AUTHORIZATION_SERVER_URL",
    environment.AUTHORIZATION_SERVER_URL
  );
  const authScope = environment.AUTH_SCOPE?.trim() || "bunpro.read";

  return {
    port,
    publicBaseUrl,
    mcpUrl,
    authorizationServerUrl,
    authAudience: environment.AUTH_AUDIENCE?.trim() || mcpUrl.href,
    authScope,
    databaseUrl: required("DATABASE_URL", environment.DATABASE_URL),
    credentialsEncryptionKey: requiredBase64Key(
      "BUNPRO_CREDENTIALS_ENCRYPTION_KEY",
      environment.BUNPRO_CREDENTIALS_ENCRYPTION_KEY
    ),
    setupTokenSecret: requiredBase64Key("SETUP_TOKEN_SECRET", environment.SETUP_TOKEN_SECRET)
  };
}

function resolvePublicBaseUrl(environment: NodeJS.ProcessEnv): URL {
  const configured = environment.PUBLIC_BASE_URL?.trim();
  if (configured) return requiredHttpsUrl("PUBLIC_BASE_URL", configured);

  const railwayDomain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) return requiredHttpsUrl("RAILWAY_PUBLIC_DOMAIN", `https://${railwayDomain}`);

  if (environment.NODE_ENV !== "production") return new URL(`http://localhost:${parsePort(environment.PORT)}`);
  throw new Error("PUBLIC_BASE_URL or RAILWAY_PUBLIC_DOMAIN must be configured for HTTP transport.");
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} must be configured for HTTP transport.`);
  return normalized;
}

function requiredHttpsUrl(name: string, value: string | undefined): URL {
  const parsed = new URL(required(name, value));
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocal) throw new Error(`${name} must use HTTPS.`);
  return parsed;
}

function requiredBase64Key(name: string, value: string | undefined): Buffer {
  const decoded = Buffer.from(required(name, value), "base64");
  if (decoded.length !== 32) throw new Error(`${name} must be a base64-encoded 32-byte secret.`);
  return decoded;
}

function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535.");
  return port;
}
