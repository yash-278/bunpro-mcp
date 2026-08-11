import * as z from "zod/v4";

export const BunproUserResponseSchema = z.object({
  user: z.object({
    data: z.object({
      attributes: z.object({
        time_zone_iana: z.string().min(1)
      }).loose()
    }).loose()
  }).loose()
}).loose();

export const ConnectionStatusOutputSchema = z.object({
  connected: z.literal(true),
  authentication_method: z.literal("frontend_session"),
  session_resolution: z.enum(["fresh_login", "cached_session", "refreshed_session", "relogged_session"]),
  authentication_cache: z.enum(["process_memory", "encrypted_store"]),
  credentials_source: z.enum(["environment", "encrypted_store"]),
  web_session_authenticated: z.literal(true),
  frontend_token_obtained: z.literal(true),
  api_authenticated: z.literal(true),
  source_timezone: z.string().min(1),
  stateless: z.literal(true)
});

export type ConnectionStatus = z.infer<typeof ConnectionStatusOutputSchema>;
export type SessionResolution = ConnectionStatus["session_resolution"];
export type AuthenticationCache = ConnectionStatus["authentication_cache"];
export type CredentialsSource = ConnectionStatus["credentials_source"];
