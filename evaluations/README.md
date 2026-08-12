# Deterministic MCP evaluations

The evaluation account is synthetic. It exists so tool-selection and multi-tool reasoning can be tested without committing a real Bunpro user's study history or relying on values that change over time.

Run the standard MCP evaluation harness against `bunpro-tools.xml` with this stdio command:

```bash
node --import tsx scripts/evaluation-fixture-server.ts
```

The fixture server uses the production tool registrations and mappers with a fixed, read-only data source. It does not require a Bunpro token or make network requests.
