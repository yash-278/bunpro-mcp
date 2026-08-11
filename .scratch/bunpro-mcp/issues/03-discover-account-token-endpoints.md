Type: research
Status: resolved
Blocked by: 01, 02

## Question

Can environment-provided Bunpro Login Credentials establish a web session and procure a Frontend Session Token entirely in memory, and which read-only frontend endpoints then provide date-bounded review, lesson, correctness, item identity, timestamp, duration, pagination, timezone, and rate-limit evidence?

## Comments

- Account API Token smoke tests failed: the frontend user route returned `401`, while legacy routes returned the same `404` as an invalid-token control.
- The credential probe must return only statuses and booleans; secrets and raw personal payloads must remain in memory.

## Resolution

- Environment-provided login credentials successfully establish a Bunpro web session and procure the Frontend Session Token entirely in memory.
- The current frontend token authenticates the tested `/api/frontend/**` routes. The Account API Token remains unsupported by them.
- `/api/frontend/user_stats/review_heatmap` provides sparse historical daily grammar, vocabulary, and mixed review counts. `/new_content_heatmap` provides analogous newly studied content counts, and `/accuracy_over_time` provides a shorter date-keyed accuracy window.
- Recent-only surfaces expose item identity, correctness, and timestamps, but no current route provides complete item-level history or daily duration for an arbitrary date.
- No probed endpoint exposed rate-limit or pagination headers.
- Known active Study Days `2026-08-10` and `2026-08-11` both produced internally consistent normalized summaries in Bunpro's `Asia/Kolkata` account timezone. No personal counts or raw payloads were retained.

Research note: [Bunpro frontend authentication and study API evidence](https://github.com/yash-278/bunpro-mcp/blob/main/docs/research/bunpro-frontend-api.md)
