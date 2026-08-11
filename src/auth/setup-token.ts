import { createHmac, timingSafeEqual } from "node:crypto";

interface SetupTokenPayload {
  principalId: string;
  expiresAt: number;
}

export class SetupTokenService {
  readonly #secret: Buffer;
  readonly #lifetimeSeconds: number;

  constructor(secret: Buffer, lifetimeSeconds = 10 * 60) {
    if (secret.length < 32) throw new Error("The setup token secret must contain at least 32 bytes.");
    this.#secret = Buffer.from(secret);
    this.#lifetimeSeconds = lifetimeSeconds;
  }

  issue(principalId: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
    const payload: SetupTokenPayload = {
      principalId,
      expiresAt: nowSeconds + this.#lifetimeSeconds
    };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return `${encoded}.${this.#sign(encoded)}`;
  }

  verify(token: string, nowSeconds = Math.floor(Date.now() / 1000)): SetupTokenPayload {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) throw new Error("The setup link is invalid.");

    const expected = Buffer.from(this.#sign(encoded), "base64url");
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error("The setup link is invalid.");
    }

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SetupTokenPayload>;
    const expiresAt = payload.expiresAt;
    if (!payload.principalId || !Number.isInteger(expiresAt) || expiresAt === undefined || expiresAt < nowSeconds) {
      throw new Error("The setup link has expired or is invalid.");
    }
    return { principalId: payload.principalId, expiresAt };
  }

  #sign(payload: string): string {
    return createHmac("sha256", this.#secret).update(payload).digest("base64url");
  }
}
