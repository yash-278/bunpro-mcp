export interface HttpConfig {
  port: number;
  publicBaseUrl: URL;
  allowLocalHosts?: boolean;
}

export function loadHttpConfig(environment: NodeJS.ProcessEnv = process.env): HttpConfig {
  return {
    port: parsePort(environment.PORT),
    publicBaseUrl: resolvePublicBaseUrl(environment),
    allowLocalHosts: environment.NODE_ENV !== "production"
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

function requiredHttpsUrl(name: string, value: string): URL {
  const parsed = new URL(value);
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocal) throw new Error(`${name} must use HTTPS.`);
  return parsed;
}

function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535.");
  return port;
}
