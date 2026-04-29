# Contributing

Thanks for considering a contribution. This project welcomes bug reports, fixes, new providers, and UI polish. Please read the threat model in [SECURITY.md](./SECURITY.md) before touching crypto or credential code.

## Setup

```
git clone https://github.com/tomasthorv/ai-usage-dash
cd ai-usage-dash
pnpm install
pnpm dev
```

Node >= 20.11 is required. pnpm is the only supported package manager.

## Workflow

1. Fork the repository.
2. Create a topic branch (`feat/cursor-team-quota`, `fix/sse-reconnect`, etc.).
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
4. Open a pull request against `main`. Fill out the PR template.

## Tests

All of these must pass before review:

```
pnpm typecheck && pnpm lint && pnpm test
```

CI runs the same commands across Node 20/22 on Ubuntu, Windows, and macOS.

## Adding a provider

See the [Adding a Provider](./README.md#adding-a-provider) section in the README and the `ProviderAdapter` type in [lib/providers/types.ts](./lib/providers/types.ts). Each provider needs a recorded fixture and a unit test that parses it.

## Code style

Biome runs on commit. Double quotes, two-space indent, trailing commas where ES allows. No `any`. No commented-out code.

## Cross-platform notes

Use `node:path` `join` for filesystem paths; never hardcode `/`. If you can, run the test suite under Git Bash on Windows before pushing — it catches most path and line-ending issues that CI would otherwise surface late.
