import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Pool } from "pg";
import type { BunproCredentials, BunproSessionSnapshot } from "../bunpro/client.js";

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_VERSION = 1;

export interface StoredBunproAccount {
  credentials: BunproCredentials;
  session?: BunproSessionSnapshot;
}

export interface CredentialVault {
  initialize(): Promise<void>;
  load(principalId: string): Promise<StoredBunproAccount | undefined>;
  save(principalId: string, account: StoredBunproAccount): Promise<void>;
  exists(principalId: string): Promise<boolean>;
  close(): Promise<void>;
}

interface EncryptedEnvelope {
  v: number;
  iv: string;
  tag: string;
  ciphertext: string;
}

export class PostgresCredentialVault implements CredentialVault {
  readonly #pool: Pool;
  readonly #key: Buffer;

  constructor(databaseUrl: string, key: Buffer) {
    this.#pool = new Pool({ connectionString: databaseUrl, max: 5 });
    this.#key = Buffer.from(key);
  }

  async initialize(): Promise<void> {
    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS bunpro_accounts (
        principal_id TEXT PRIMARY KEY,
        encrypted_payload TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async load(principalId: string): Promise<StoredBunproAccount | undefined> {
    const result = await this.#pool.query<{ encrypted_payload: string }>(
      "SELECT encrypted_payload FROM bunpro_accounts WHERE principal_id = $1",
      [principalId]
    );
    const encrypted = result.rows[0]?.encrypted_payload;
    return encrypted ? decryptAccount(encrypted, this.#key) : undefined;
  }

  async save(principalId: string, account: StoredBunproAccount): Promise<void> {
    const encrypted = encryptAccount(account, this.#key);
    await this.#pool.query(
      `INSERT INTO bunpro_accounts (principal_id, encrypted_payload)
       VALUES ($1, $2)
       ON CONFLICT (principal_id) DO UPDATE
       SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()`,
      [principalId, encrypted]
    );
  }

  async exists(principalId: string): Promise<boolean> {
    const result = await this.#pool.query("SELECT 1 FROM bunpro_accounts WHERE principal_id = $1", [principalId]);
    return (result.rowCount ?? 0) > 0;
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

export function encryptAccount(account: StoredBunproAccount, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(account), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    v: ENVELOPE_VERSION,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  };
  return JSON.stringify(envelope);
}

export function decryptAccount(value: string, key: Buffer): StoredBunproAccount {
  assertKey(key);
  const envelope = JSON.parse(value) as Partial<EncryptedEnvelope>;
  if (
    envelope.v !== ENVELOPE_VERSION ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Unsupported encrypted Bunpro account payload.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final()
  ]);
  const account = JSON.parse(plaintext.toString("utf8")) as Partial<StoredBunproAccount>;
  if (!account.credentials?.username || !account.credentials.password) {
    throw new Error("Encrypted Bunpro account payload is invalid.");
  }
  return account as StoredBunproAccount;
}

function assertKey(key: Buffer): void {
  if (key.length !== 32) throw new Error("The credential encryption key must contain exactly 32 bytes.");
}
