# Deterministic MCP evaluations

The evaluation account is synthetic. It exists so tool-selection and multi-tool reasoning can be tested without committing a real Bunpro user's study history or relying on values that change over time.

Run the standard MCP evaluation harness against `bunpro-tools.xml` with this stdio command:

```bash
node --import tsx scripts/evaluation-fixture-server.ts
```

The fixture server uses the production tool registrations and mappers with a fixed, read-only data source. It does not require a Bunpro token or make network requests.

## Skill evaluations

`plugins/bunpro-mcp/evals/` holds a `claude plugin eval` suite for the `study-plan` skill. Each tool answers from a synthetic file under `mocks/`, so a run needs no Bunpro token, starts no real connector and never contacts Bunpro. Results go to `evals/results/`, which Git ignores.

Run it when the skill changes:

```bash
claude plugin eval plugins/bunpro-mcp --ablation none
```

That is about 18 agent runs on your plan usage, because each of the six cases runs three times. The suite stays out of CI because a run needs a model credential. Never add `--allow-real-servers` or `--mocks off`, because both start the real connector.

The mocks are captured from `scripts/evaluation-fixture-server.ts`, and `npm run check` parses each one with its tool's output schema. Cases that return data set today to the mocks' date, so the agent doesn't report them as stale.
