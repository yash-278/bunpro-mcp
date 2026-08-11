import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SetupTokenService } from "../src/auth/setup-token.js";
import { principalIdFromAuth } from "../src/bunpro/session-manager.js";
import { decryptAccount, encryptAccount } from "../src/storage/credential-vault.js";

test("stored Bunpro authentication material is encrypted and authenticated", () => {
  const key = randomBytes(32);
  const account = {
    credentials: { username: "person@example.com", password: "correct horse battery staple" },
    session: { cookies: { _grammar_app_session: "cookie-value" }, frontendToken: "frontend-token" }
  };

  const encrypted = encryptAccount(account, key);
  assert.doesNotMatch(encrypted, /person@example\.com|correct horse|cookie-value|frontend-token/);
  assert.deepEqual(decryptAccount(encrypted, key), account);
  assert.throws(() => decryptAccount(encrypted, randomBytes(32)));

  const tampered = JSON.parse(encrypted) as { ciphertext: string };
  tampered.ciphertext = `${tampered.ciphertext.slice(0, -1)}A`;
  assert.throws(() => decryptAccount(JSON.stringify(tampered), key));
});

test("Bunpro setup tokens are identity-bound, signed, and expiring", () => {
  const tokens = new SetupTokenService(randomBytes(32), 60);
  const token = tokens.issue("principal-a", 1_000);
  assert.deepEqual(tokens.verify(token, 1_059), { principalId: "principal-a", expiresAt: 1_060 });
  assert.throws(() => tokens.verify(`${token}x`, 1_059));
  assert.throws(() => tokens.verify(token, 1_061));
});

test("OAuth subjects map to stable, isolated, non-PII principal IDs", () => {
  const auth = (subject: string, issuer = "https://issuer.example/"): AuthInfo => ({
    token: "redacted",
    clientId: "client",
    scopes: ["bunpro.read"],
    expiresAt: 2_000,
    extra: { subject, issuer }
  });

  const first = principalIdFromAuth(auth("auth0|person-a"));
  assert.equal(first, principalIdFromAuth(auth("auth0|person-a")));
  assert.notEqual(first, principalIdFromAuth(auth("auth0|person-b")));
  assert.notEqual(first, principalIdFromAuth(auth("auth0|person-a", "https://other.example/")));
  assert.doesNotMatch(first, /auth0|person|issuer/);
});
