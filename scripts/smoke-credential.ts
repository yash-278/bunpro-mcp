export function smokeCredentialHeaders(
  token: string,
  method: string | undefined
): Record<string, string> {
  if (method === undefined) return { "X-Bunpro-Token": token };
  if (method === "bearer") return { Authorization: `Bearer ${token}` };
  throw new Error("BUNPRO_SMOKE_AUTH must be bearer or unset.");
}
