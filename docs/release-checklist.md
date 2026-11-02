# Release checklist

## Every release

Work through this list in order for every server release. Commands that take a token use your own Account API Token, so never run them in CI, paste their output into an issue, or commit a value.

### 1. Local live smoke

- [ ] Run the all-tools smoke against a local server:

  ```bash
  BUNPRO_API_TOKEN="your token" npm run live:test:tools
  ```

- [ ] Read the line `list_weak_spots: accuracy above 1 seen: yes|no`, which confirms the `accuracy` scale. `yes` rules out a 0-to-1 scale. `no` while Bunpro lists items means the scale may be 0 to 1, so stop the release until that is resolved. `no` while Bunpro lists nothing proves nothing, so repeat the check next release.

### 2. Deploy and hosted checks

- [ ] Merge the feature pull requests to `main`. Railway deploys them.
- [ ] `GET /healthz` on `https://bunpro.yashkadam.com` returns HTTP 200.
- [ ] A `POST /mcp` with no credential returns HTTP 401. So does one with both `X-Bunpro-Token` and `Authorization: Bearer`. Use a synthetic value for both headers.
- [ ] Run the all-tools smoke against the hosted server, which makes about 20 Bunpro requests:

  ```bash
  BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://bunpro.yashkadam.com/mcp" BUNPRO_SMOKE_AUTH=bearer npm run live:test:tools
  ```

- [ ] Call `get_connection_status` once on the hosted server with `X-Bunpro-Token`, from ChatGPT or another host that sends that header.

### 3. Version and changelog

- [ ] Open the final release pull request. Bump `package.json` and `plugins/bunpro-mcp/.claude-plugin/plugin.json` to the same version, even if the plugin didn't change. Claude Code users get new plugin files only when the version changes, so this bump publishes the plugin. `npm run check` fails if the two differ.
- [ ] In `CHANGELOG.md`, move the `## Unreleased` entries under a heading for the new version and date.
- [ ] If the `study-plan` skill changed, run the [skill evaluations](../evaluations/README.md#skill-evaluations).
- [ ] Merge the pull request after its checks pass.

### 4. Claude plugin

- [ ] Run `claude plugin validate .` and `claude plugin validate plugins/bunpro-mcp`.
- [ ] In Claude Code, add the marketplace, install the plugin and ask for a study plan. The [setup guide](claude-setup.md#plugin) has the commands.
- [ ] Add the marketplace on claude.ai, and note how chat lists the connector.

### 5. Claude Desktop and GitHub release

- [ ] Run `npm ci` and `npm run build:mcpb` on the release commit.
- [ ] Install `dist/bunpro-mcp.mcpb` in Claude Desktop and call `get_connection_status`.
- [ ] Publish the GitHub release with `dist/bunpro-mcp.mcpb` attached under that exact name.

## 0.4.0 record

This is the open-source community release checklist as it stood for 0.4.0.

### Authorization and repository

- [x] Bunpro open-source approval is recorded in [the release record](public-source-release.md).
- [x] Private correspondence and screenshots are excluded from the repository.
- [x] Current source and full Git history were scanned for credentials and personal data.
- [x] README documents hosted use, local stdio, Docker, and remote HTTPS deployment.
- [x] Security, privacy, support, contribution, conduct, and license files are present.
- [ ] Release pull request passes all required checks.
- [ ] Repository visibility reports `PUBLIC` after merge.
- [ ] Branch protection, vulnerability reporting, secret scanning, and workflow permissions are verified.

### Hosted service

- [x] Railway deploys automatically from `main` using the included Dockerfile.
- [x] The production service has no Auth0, database, encryption-key, setup-token, username, password, or deployment-wide Bunpro token variables.
- [x] Every caller provides their own token through a protected request header.
- [x] Host validation, body limits, response limits, timeouts, and bounded upstream concurrency are enabled.
- [x] Bunpro throttling is not retried automatically.
- [ ] Railway deploys the v0.4.0 public-release commit successfully.
- [ ] `GET /healthz` returns HTTP 200 on the canonical domain.
- [ ] Missing and ambiguous token requests return HTTP 401 without leaking request data.
- [ ] A low-volume tool smoke passes with a valid caller-owned token.

### Product and documentation

- [x] All eight tools are read-only, stateless, bounded, and annotated as non-destructive.
- [x] Authentication, throttling, unavailable routes, malformed responses, and schema drift fail closed.
- [x] Sparse historical absence is not silently represented as zero.
- [x] Public website links the GitHub repository and self-hosting guide.
- [x] FAQ states that the project is open source and can run locally or remotely.
- [x] Public copy explains unofficial status, experimental access, hosted-operator trust, and token rotation.
- [ ] Production website shows the open-source release content.

Atlas integration remains out of scope for this release.

### Claude Desktop bundle

The `.mcpb` is a release asset and is never committed.

- [ ] Run `npm ci` and `npm run build:mcpb` on the release commit. The script fails if the manifest doesn't pass `mcpb validate`.
- [ ] Install `dist/bunpro-mcp.mcpb` in Claude Desktop and call `get_connection_status`.
- [ ] Attach `dist/bunpro-mcp.mcpb` to the GitHub release under that exact name, because `docs/claude-setup.md` tells learners to look for it.
