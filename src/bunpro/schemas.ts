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
  authentication_method: z.literal("account_api_token"),
  token_source: z.enum(["environment", "request_bearer"]),
  token_persisted_by_server: z.literal(false),
  api_authenticated: z.literal(true),
  source_timezone: z.string().min(1),
  stateless: z.literal(true)
});

export type ConnectionStatus = z.infer<typeof ConnectionStatusOutputSchema>;
export type TokenSource = ConnectionStatus["token_source"];
