import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SetupTokenService } from "../src/auth/setup-token.js";
import { BunproSessionManager, principalIdFromAuth } from "../src/bunpro/session-manager.js";
import type {
  CredentialVault,
  StoredBunproAccount
} from "../src/storage/credential-vault.js";

class MemoryCredentialVault implements CredentialVault {
  readonly accounts = new Map<string, StoredBunproAccount>();

  async initialize(): Promise<void> {}

  async load(principalId: string): Promise<StoredBunproAccount | undefined> {
    return this.accounts.get(principalId);
  }

  async save(principalId: string, account: StoredBunproAccount): Promise<void> {
    this.accounts.set(principalId, account);
  }

  async exists(principalId: string): Promise<boolean> {
    return this.accounts.has(principalId);
  }

  async remove(principalId: string): Promise<boolean> {
    return this.accounts.delete(principalId);
  }

  async close(): Promise<void> {}
}

function authInfo(): AuthInfo {
  return {
    token: "redacted",
    clientId: "test-client",
    scopes: ["bunpro.read"],
    expiresAt: 2_000,
    extra: { subject: "auth0|person-a", issuer: "https://issuer.example/" }
  };
}

function storedAccount(): StoredBunproAccount {
  return {
    credentials: { username: "person@example.com", password: "test-password" },
    session: {
      cookies: {
        _grammar_app_session: "stored-session",
        frontend_api_token: "stored-token"
      },
      frontendToken: "stored-token"
    }
  };
}

test("hosted users can permanently remove their stored Bunpro authentication", async () => {
  const vault = new MemoryCredentialVault();
  const auth = authInfo();
  const principalId = principalIdFromAuth(auth);
  vault.accounts.set(principalId, storedAccount());

  const sessions = new BunproSessionManager(
    vault,
    new SetupTokenService(randomBytes(32)),
    new URL("https://mcp.example.com")
  );
  const account = sessions.accountFor(auth);

  assert.deepEqual(await account.disconnect(), {
    disconnected: true,
    account_was_linked: true,
    stored_authentication_present: false
  });
  assert.equal(await vault.load(principalId), undefined);

  assert.deepEqual(await account.disconnect(), {
    disconnected: true,
    account_was_linked: false,
    stored_authentication_present: false
  });
});

test("disconnect waits for an active connection refresh before deleting the account", async () => {
  const vault = new MemoryCredentialVault();
  const auth = authInfo();
  const principalId = principalIdFromAuth(auth);
  vault.accounts.set(principalId, storedAccount());

  let releaseResponse: (() => void) | undefined;
  const responseGate = new Promise<void>(resolve => {
    releaseResponse = resolve;
  });
  let markRequestStarted: (() => void) | undefined;
  const requestStarted = new Promise<void>(resolve => {
    markRequestStarted = resolve;
  });

  const sessions = new BunproSessionManager(
    vault,
    new SetupTokenService(randomBytes(32)),
    new URL("https://mcp.example.com"),
    async () => {
      markRequestStarted?.();
      await responseGate;
      return new Response(
        JSON.stringify({ user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  );

  const connection = sessions.checkConnection(principalId);
  await requestStarted;
  const disconnection = sessions.disconnect(principalId);
  releaseResponse?.();

  await connection;
  const result = await disconnection;
  assert.equal(result.account_was_linked, true);
  assert.equal(await vault.load(principalId), undefined);
});
