# Security

## Reporting

Email tommibragi03@gmail.com with details and a proof-of-concept if available. You will receive a response within 7 days. Please do not file public issues for vulnerabilities.

## Supported versions

| Version | Status |
|---|---|
| 0.x | active |

## Threat model

In scope:

- Provider-key egress from the server (keys are server-only and never returned to the browser).
- XSS that could exfiltrate snapshots or trigger credential mutations (mitigated by CSP, no inline scripts, no `dangerouslySetInnerHTML`).
- CSRF on credential mutations (double-submit cookie plus `SameSite=Strict`).
- Timing attacks on the CSRF compare path (constant-time comparison).

Out of scope:

- An adversary with local read access to `app.db` and `.env.local` (single-user local trust model).
- libsodium side-channel attacks.
- Transitive supply-chain compromise (mitigated, not eliminated, by Dependabot and `pnpm audit` in CI).

## At-rest encryption

Credentials are encrypted with libsodium sealed boxes (`crypto_box_seal`) using an X25519 keypair derived from `MASTER_KEY` via `crypto_kdf_derive_from_key` (subkey id 1). Plaintext credentials only exist transiently inside the adapter execution scope, immediately before `adapter.fetchUsage` is called, and are zeroed afterwards.

## CSP

The Content Security Policy is:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

There are no inline scripts. `dangerouslySetInnerHTML` is banned by linter rule.
