import { createHash } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { BunproClient, type BunproCredentials, type FetchLike } from "./client.js";
import { BunproAccountNotLinkedError } from "./errors.js";
import type { ConnectionStatus } from "./schemas.js";
import type { CredentialVault, StoredBunproAccount } from "../storage/credential-vault.js";
import { SetupTokenService } from "../auth/setup-token.js";

interface ManagedAccount {
  stored: StoredBunproAccount;
  client: BunproClient;
}

export class BunproSessionManager {
  readonly #vault: CredentialVault;
  readonly #setupTokens: SetupTokenService;
  readonly #publicBaseUrl: URL;
  readonly #fetch: FetchLike;
  readonly #accounts = new Map<string, Promise<ManagedAccount | undefined>>();

  constructor(
    vault: CredentialVault,
    setupTokens: SetupTokenService,
    publicBaseUrl: URL,
    fetchImplementation: FetchLike = fetch
  ) {
    this.#vault = vault;
    this.#setupTokens = setupTokens;
    this.#publicBaseUrl = publicBaseUrl;
    this.#fetch = fetchImplementation;
  }

  checkerFor(authInfo: AuthInfo): { checkConnection(): Promise<ConnectionStatus> } {
    const principalId = principalIdFromAuth(authInfo);
    return { checkConnection: () => this.checkConnection(principalId) };
  }

  async checkConnection(principalId: string): Promise<ConnectionStatus> {
    const account = await this.#getAccount(principalId);
    if (!account) throw new BunproAccountNotLinkedError(this.setupUrl(principalId));

    const status = await account.client.checkConnection();
    account.stored.session = account.client.sessionSnapshot();
    await this.#vault.save(principalId, account.stored);
    return status;
  }

  setupUrl(principalId: string): string {
    const url = new URL("/setup", this.#publicBaseUrl);
    url.searchParams.set("token", this.#setupTokens.issue(principalId));
    return url.href;
  }

  verifySetupToken(token: string): string {
    return this.#setupTokens.verify(token).principalId;
  }

  async isLinked(principalId: string): Promise<boolean> {
    return this.#vault.exists(principalId);
  }

  async link(principalId: string, credentials: BunproCredentials): Promise<ConnectionStatus> {
    if (await this.#vault.exists(principalId)) {
      throw new Error("A Bunpro account is already linked to this identity.");
    }

    const client = this.#createClient({ credentials });
    const status = await client.checkConnection();
    const stored: StoredBunproAccount = { credentials, session: client.sessionSnapshot() };
    await this.#vault.save(principalId, stored);
    this.#accounts.set(principalId, Promise.resolve({ stored, client }));
    return status;
  }

  async #getAccount(principalId: string): Promise<ManagedAccount | undefined> {
    let pending = this.#accounts.get(principalId);
    if (!pending) {
      pending = this.#vault.load(principalId).then(stored =>
        stored ? { stored, client: this.#createClient(stored) } : undefined
      );
      this.#accounts.set(principalId, pending);
    }
    return pending;
  }

  #createClient(stored: StoredBunproAccount): BunproClient {
    return new BunproClient(stored.credentials, this.#fetch, {
      ...(stored.session ? { initialSession: stored.session } : {}),
      authenticationCache: "encrypted_store",
      credentialsSource: "encrypted_store"
    });
  }
}

export function principalIdFromAuth(authInfo: AuthInfo): string {
  const subject = authInfo.extra?.subject;
  const issuer = authInfo.extra?.issuer;
  if (typeof subject !== "string" || typeof issuer !== "string") {
    throw new Error("The validated access token does not identify a user.");
  }
  return createHash("sha256").update(issuer).update("\0").update(subject).digest("hex");
}
