# Study View output audit

## Decision

Seven of the eight existing tools merit a custom Study View, but they should reuse four view families rather than become eight unrelated widgets. `get_connection_status` should remain a compact native result. The other mappings are:

| Tool | Learner job | Custom view | View family |
| --- | --- | --- | --- |
| `get_connection_status` | Confirm the connection is usable | No | Native status result |
| `get_study_day_summary` | Understand one study day without mistaking missing evidence for zero | Yes | Daily Study Brief |
| `get_study_range_summary` | Review what happened across a bounded period and whether the evidence is complete | Yes | Study Period Explorer, evidence mode |
| `get_review_schedule` | Decide what to study now and anticipate the next few days | Yes; first pilot | Review Forecast |
| `list_study_decks` | Check active deck goals and broad completion | Yes, as a compact variant | Learning Progress Dashboard, deck mode |
| `get_recent_activity` | Recall the latest visible review attempts | Yes, as a compact variant | Daily Study Brief, recent-activity mode |
| `get_learning_progress` | Understand long-term study, SRS distribution, and review history | Yes | Learning Progress Dashboard |
| `get_activity_trend` | See how review volume, new content, and accuracy changed | Yes | Study Period Explorer, trend mode |

This mapping follows the product's own learner jobs: plan next study, understand study rhythm, and see the bigger picture ([homepage use cases](../../src/homepage.ts#L246-L266)). It also preserves the current one-tool/one-result model: the MCP advertises exactly eight read-only tools with explicit output schemas, and successful results expose the same object as both `structuredContent` and JSON text ([adapter contract](../../tests/server.test.ts#L69-L126)). A Study View should present one returned object; it should not silently call or merge other tools.

## Method and privacy boundary

The audit used only the checked-in tool registrations, public Zod schemas, service projections, tests, synthetic evaluation fixture, and public website copy. No live account was queried. The synthetic fixture is deliberately broad enough to expose sparse study dates, active and inactive decks, correct and incorrect attempts, session aggregates, weekly streak data, five JLPT levels, and cram aggregates ([synthetic fixture](../../scripts/evaluation-fixture-server.ts#L34-L170)).

All recommendations below change presentation, not the public facts. Existing `structuredContent` should remain usable by Atlas and clients that ignore ChatGPT UI extensions. "Omit" therefore means omit from the learner-facing visual surface, not delete from the tool contract.

## Cross-tool presentation rules

### Translate evidence states; never flatten them

The Study Day contract distinguishes `available`, `no_source_record`, and `unavailable`, and separately records source consistency ([evidence schemas](../../src/bunpro/schemas.ts#L33-L60)). The website already explains the critical semantic: missing source data does not automatically mean zero activity ([limitations copy](../../src/homepage.ts#L427-L436)). Every Study View that uses historical series must preserve these distinctions:

- **Available zero:** show `0`.
- **No source record:** show “No record from source” or a patterned gap, never `0`.
- **Unavailable source:** show “Unavailable” and a partial-evidence badge.
- **Available record with null value:** show “Not reported,” not zero and not “No activity.”

Charts must render missing days as gaps rather than connecting or zero-filling them. Status cannot be conveyed by color alone; use text, icons, patterns, or accessible labels as well.

### Use one evidence badge vocabulary

Use three learner-facing badges across the rich views:

- **Complete evidence** for `overall_query_status: complete`.
- **Partial evidence** for `overall_query_status: partial`.
- **Missing record** at an individual measure or day where coverage is `no_source_record`.

Technical source statuses (`contract_changed`, `rate_limited`, `upstream_unavailable`, `not_queried`) belong behind “Evidence details” on successful partial results. The server already turns failed calls into sanitized `BUNPRO_*` text errors rather than structured result objects ([error mapping](../../src/bunpro/errors.ts#L1-L24), [sanitization test](../../tests/server.test.ts#L139-L163)); failed calls should therefore use the host's native error treatment rather than a widget inventing a more specific diagnosis.

### Translate machine provenance into human labels

Flags such as `forecast_is_projection`, `derived_measures_labeled`, `combined.derived`, and `mixed.source_supplied` exist to preserve meaning, not to be printed verbatim ([forecast schema](../../src/bunpro/schemas.ts#L116-L132), [progress and trend schemas](../../src/bunpro/schemas.ts#L223-L287)). Convert them into labels such as “Projection,” “Average per recorded day,” “Combined from grammar and vocabulary,” and “Reported by Bunpro.”

### Keep technical identifiers out of the default surface

Raw tool names, deck IDs and slugs, attempt IDs, content IDs, authentication method, token source, and contract booleans do not help a learner answer the associated question. Keep them in the structured result and, where useful for support, an explicit technical-details disclosure. Never render a credential or credential-bearing value; the product boundary requires the token to remain in protected client configuration ([README credential boundary](../../README.md#L27-L47)).

## Tool-by-tool audit

### `get_connection_status` — native status result

**Learner job.** Confirm that ChatGPT can read Bunpro before asking study questions. The public website presents exactly this job as “Make sure ChatGPT can connect to your Bunpro account” ([tool copy](../../src/homepage.ts#L73-L80)).

**Default-visible facts.** “Connected to Bunpro” and the Bunpro source timezone. A one-line privacy reassurance, “Token not stored,” is useful but should not dominate.

**Progressive disclosure.** Authentication method, token source, statelessness, and `token_persisted_by_server: false`; these are operational evidence rather than study content. The complete output is a small seven-field object ([connection schema](../../src/bunpro/schemas.ts#L3-L14)).

**Omit from the visual surface.** `api_authenticated` duplicates `connected`; raw enum values such as `account_api_token` and `request_header` add noise.

**States.** Success is inherently non-empty. Any failure has no structured output and should remain the sanitized native tool error. Do not show an elaborate custom card for a single status line.

**Misleading risk.** “Connected” proves authentication at retrieval time; it does not guarantee every experimental Bunpro route is currently available. Avoid “Everything is working” or an account-wide health claim. The Frontend API is explicitly undocumented and may change ([domain context](../../CONTEXT.md#L7-L17)).

### `get_study_day_summary` — Daily Study Brief

**Learner job.** Answer “What did I study on this Bunpro calendar day?” while stating exactly what the source can support. This is the tool's registered purpose, including the rule that missing sparse records remain unknown rather than zero ([registration](../../src/server.ts#L90-L119)).

**Default-visible facts.** Date; an “In progress” marker when applicable; evidence badge; source-total reviews; source-total new content; accuracy; and a clear “No source record” state for each missing measure. Use the Bunpro source total as the headline count.

**Progressive disclosure.** Grammar/vocabulary splits; source timezone and a timezone mismatch warning; per-source coverage windows; unavailable measures; and component consistency. If `component_sum` differs from `source_total`, disclose both with “Bunpro total differs from visible grammar + vocabulary,” not an arithmetic-looking error banner. The tests prove that mismatches, explicit zero, absent components, and a present-but-null accuracy value are all valid representable states ([day evidence tests](../../tests/study-tools.test.ts#L37-L89), [zero/null test](../../tests/study-tools.test.ts#L168-L202)).

**Omit from the default surface.** `component_sum`, `consistency: match`, individual coverage enum strings, first/last source dates, and the full unavailable-measures list. Surface these only when they affect interpretation or the learner opens evidence details.

**States.**

- All three measures available: normal brief.
- One source unavailable: show the available facts plus **Partial evidence**, not an all-or-nothing empty card.
- No source record for a measure: show an explicit gap, not zero.
- Current day: mark **In progress** because totals may still change.
- Tool error: native sanitized error with retry guidance appropriate to the returned code.

**Misleading risk.** Do not infer study duration, exact daily correct/incorrect counts, or complete item history: the service explicitly lists those measures as unavailable ([service boundary](../../src/bunpro/study.ts#L27-L34)). Do not compute accuracy from visible review totals; accuracy is an independent source measure.

### `get_study_range_summary` — Study Period Explorer, evidence mode

**Learner job.** Answer “What evidence exists for each day in this period?” and support reliable catch-up over an inclusive range. The output always includes one day object per requested calendar day and is bounded to 93 days ([range schema](../../src/bunpro/schemas.ts#L75-L108), [range behavior](../../tests/study-tools.test.ts#L91-L120)).

**Default-visible facts.** Requested date range; Complete/Partial evidence badge; aggregate review and new-content totals; average accuracy; source-record-day counts; and a day grid that shows recorded activity and explicit gaps. For small ranges, the grid may use rows; for longer ranges, use a compact calendar or timeline.

**Progressive disclosure.** Select a day to see its review, new-content, and accuracy evidence; reveal grammar/vocabulary splits; show source coverage windows and `contiguous_checked_through`; show unavailable measures and timezone details. The contiguous watermark is valuable to Atlas and support diagnostics but not a learner headline.

**Omit from the default surface.** Repeated per-day `component_sum`, consistency flags when they match, raw coverage enums, and contiguous-check fields. Do not repeat the same aggregate in both a large KPI and chart legend.

**States.** A complete query whose period contains no source records is a valid evidence result, not a failure and not proof of inactivity. Partial queries keep visible supported series and mark unavailable series. An empty-looking period should say “No records supplied for this range.” A future, reversed, or over-93-day request remains a native validation error; the service rejects invalid ranges before reading the source ([range validation](../../tests/study-tools.test.ts#L122-L139), [93-day bound](../../tests/study-tools.test.ts#L204-L225)).

**Misleading risk.** Aggregate accuracy is the arithmetic mean of source-present daily percentages, not a review-weighted accuracy. Review and new-content totals use source totals only on days with source records. Label them accordingly, and never divide by every requested calendar day unless the UI explicitly calls that a separate derived measure.

### `get_review_schedule` — Review Forecast

**Learner job.** Answer “What should I study now, and how heavy do the next few days look?” The contract deliberately separates due-now work from a forecast of later today, tomorrow, and dated buckets ([schedule projection](../../src/bunpro/planning.ts#L11-L45)).

**Default-visible facts.** A strong due-now total with grammar/vocabulary split; a dated bar or compact column for each forecast bucket; “Projection” attached to the entire forecast region; and a subtle “as of” time. This should be the first Study View pilot because its hierarchy is clear, its result is bounded to at most 14 forecast buckets, and it directly supports the primary learner moment.

**Progressive disclosure.** Source timezone, exact retrieval time, per-bucket grammar/vocabulary split, and an accessible table equivalent to the chart.

**Omit from the default surface.** Raw bucket enums and `forecast_is_projection: true`. Translate `later_today` and `tomorrow` into learner-facing labels. Do not repeat a total in a tooltip if it is already labeled on the bar.

**States.** If due now is zero, say “Nothing due now” while still showing upcoming projections. Zero-valued forecast buckets remain valid and should not vanish. The current contract has no partial-success state: a successful result is structurally complete; source or contract failure uses the native sanitized error.

**Misleading risk.** Never add `due_now.total` to forecast buckets as a single workload total: due now and later projections are different concepts and may overlap as time advances. Forecast values are not completed study and should not be styled like historical activity; the registration says this explicitly ([tool description](../../src/server.ts#L152-L180)).

### `list_study_decks` — Learning Progress Dashboard, deck mode

**Learner job.** Answer “Which decks am I studying, what are their goals, and what broad progress has Bunpro returned?” The public contract provides deck configuration rather than queued review items ([registration](../../src/server.ts#L183-L211)).

**Default-visible facts.** Deck title; active status; daily goal; combined current daily-goal progress with a grammar/vocabulary split; and returned completed/content counts. Render a compact list of deck cards rather than a novel dashboard shell.

**Progressive disclosure.** Batch size, deck type, grammar/vocabulary completion details, pagination state (`count`, `total_matching`, `has_more`), and inactive decks when the caller requested them.

**Omit from the default surface.** Deck ID, slug, raw deck-type value, `active_only`, and repeated counts when no results are truncated.

**States.** Zero matching decks should say “No active study decks returned,” not “You have no decks.” If `has_more` is true, show that the view is limited. Missing selected-deck metadata fails the whole tool closed rather than producing a partial deck ([deck service and failure](../../src/bunpro/planning.ts#L48-L84), [synthetic contract test](../../tests/planning-tools.test.ts#L30-L103)).

**Misleading risk.** The schema supplies counts but no explicit percentage-completion contract. Do not present a percentage or promise “deck completion” unless a later source decision proves the denominator semantics. Do not call these queued reviews. Treat `daily_goal_progress.grammar + vocabulary` as returned progress toward the daily goal only when labeled as a computed sum, and handle a zero goal without division.

### `get_recent_activity` — Daily Study Brief, recent-activity mode

**Learner job.** Recall what the source most recently exposed, either in a rolling last-24-hours view or a latest-attempts view. It is not complete historical evidence or guaranteed pagination ([registration](../../src/server.ts#L214-L243)).

**Default-visible facts.** Human-readable view label; returned attempt count; an explicit “Recent source window may be incomplete” note; and a compact timeline containing time, label (falling back to content type), and correct/incorrect state. Correctness must use an icon and text in addition to color.

**Progressive disclosure.** `has_more` and `total_available`; source timezone; content type; session count; XP delta; Buncoin delta. Keep session aggregates in a separate “Session totals” disclosure because they are nullable and not available in every view.

**Omit from the default surface.** Attempt ID, content ID, raw completeness enum, raw view enum, and null session placeholders.

**States.** No attempts means “No attempts returned in this source window,” not “No study.” A null `label` falls back to a generic content-type label. `sessions: null` means session aggregates were not supplied, not zero sessions. A limited result must say that more source records were available.

**Misleading risk.** Do not compute or prominently chart an “accuracy” from this bounded sample; it may be a rolling or latest subset and is explicitly not guaranteed complete. Do not infer an activity streak, day total, or arbitrary-day history from it. The service's completeness value makes this boundary machine-readable ([recent output construction](../../src/bunpro/planning.ts#L86-L123)).

### `get_learning_progress` — Learning Progress Dashboard

**Learner job.** Understand long-term account study facts, current SRS-stage distribution across JLPT levels, review aggregates, and cram activity. These are four distinct information layers in one output ([progress schema](../../src/bunpro/schemas.ts#L223-L253)).

**Default-visible facts.** Current streak and returned weekly streak; days studied; grammar/vocabulary studied; a JLPT N5–N1 selector; and, for the selected level, the combined SRS-stage count distribution clearly labeled “Grammar + vocabulary.” Default to a compact summary with an explicit expand/fullscreen action.

**Progressive disclosure.** Grammar-only and vocabulary-only stage distributions; per-level review totals and accuracy; a note that the combined SRS counts are derived; a note that mixed review totals are source supplied; and a separate cram section with item and session aggregates. Do not place cram beside normal study KPIs as if it were the same activity stream.

**Omit from the default surface.** `retrieved_at`, `derived`, `source_supplied`, every JLPT level's full table at once, and raw duration strings when a formatted duration is available. Avoid repeating `total_count` beside a stack whose labeled segments already sum to it unless it materially aids accessibility.

**States.** The output contract has no partial-success marker: five JLPT entries are required, while weekly streak can contain fewer than seven rows. A zero count is a valid fact. An empty weekly array means no weekly rows were returned, not necessarily no study. If any required upstream contract fails, use the native sanitized error rather than rendering a partially fabricated dashboard.

**Misleading risk.** The result has stage counts but no target-size or curriculum-denominator field. Therefore it cannot support “percent complete toward N3” or a progress ring claiming level completion. Present SRS distribution and studied counts, not course completion. Review totals are historical performance; they are not the same thing as current SRS-stage progress. The service derives combined stage counts but preserves source-supplied mixed review totals separately ([progress projection](../../src/bunpro/progress.ts#L18-L57)).

### `get_activity_trend` — Study Period Explorer, trend mode

**Learner job.** Answer “How did my review volume, new-content volume, and accuracy change during this period?” while keeping the daily evidence behind every derived metric. The registered description explicitly promises preserved daily facts and source-present-day averages ([registration](../../src/server.ts#L276-L304)).

**Default-visible facts.** Date range; Complete/Partial evidence badge; review and new-content totals; their averages explicitly labeled “per recorded day”; average daily accuracy; and a timeline with reviews/new content as bars and accuracy as a separate-scale line. Missing points must remain gaps.

**Progressive disclosure.** Toggle or select a day for the same Daily Study evidence; grammar/vocabulary splits; source-record-day counts; source coverage windows; timezone details; and an accessible table. Show a provenance note for derived metrics rather than the raw `derived_measures_labeled` boolean.

**Omit from the default surface.** Full day objects beneath the chart, raw source statuses when all sources are available, and repeated totals in multiple legends/cards.

**States.** Partial results retain available series and disable only unavailable series. A series with zero source-record days should display “No records supplied” and no average, because the schema allows `average_per_source_record_day` and `average_percent` to be null. Valid recorded zeros remain plotted at zero. Errors remain native and sanitized.

**Misleading risk.** The review/new-content averages exclude days without source records; accuracy averages daily percentages rather than individual attempts. Do not interpolate missing accuracy, use a shared y-axis for counts and percentages, label correlation as causation, or translate these facts into a generic “consistency score.” The trend test confirms that source-present-day averages and no-source-record days coexist in one result ([trend behavior](../../tests/progress-tools.test.ts#L64-L108)).

## Redundancy and confusion to remove in the Study View layer

1. **Raw JSON plus structured output.** Every success currently serializes the same object into text and `structuredContent` ([representative handlers](../../src/server.ts#L105-L111), [adapter assertion](../../tests/server.test.ts#L120-L126)). A ChatGPT Study View should render the structured object once and leave a concise textual fallback for non-UI clients; it should not visually repeat the JSON under the widget.
2. **Range and trend overlap.** `get_study_range_summary` and `get_activity_trend` both return the daily evidence, date bounds, timezone, status, and source coverage. Use one Study Period Explorer component with evidence and trend modes, not two incompatible visual languages. Range mode foregrounds coverage and daily facts; trend mode foregrounds explicitly derived metrics.
3. **Source total versus visible components.** Study Day and period facts can contain a source total that differs from grammar plus vocabulary. Use the source total as the headline and disclose the mismatch; never silently replace it with the component sum.
4. **Machine enums in learner copy.** Convert `no_source_record`, `upstream_rolling_window_not_guaranteed_complete`, and similar values into short human language. Keep the exact values only in details.
5. **“Progress” without a denominator.** Deck and JLPT output names invite percentage bars, but the current contracts do not establish curriculum completion denominators. Counts and stage distributions are safe; completion percentages are not.
6. **Several notions of accuracy.** Study history supplies daily accuracy, learning progress supplies lifetime-like review aggregates, and recent activity exposes a bounded correct/incorrect sample. Keep their labels and contexts distinct; never place them on one comparable leaderboard.
7. **Technical completeness versus learner completeness.** `overall_query_status: complete` means the requested sources were available. It does not mean every date had a record. The view must still show per-day and per-measure gaps.

## Recommended delivery order

1. **Review Forecast pilot** for `get_review_schedule`: smallest bounded result, clearest hierarchy, and direct answer to “What should I study now?”
2. **Daily Study Brief** for `get_study_day_summary`: establishes the shared evidence badge and missing-versus-zero language.
3. **Study Period Explorer** for `get_activity_trend`, then reuse it for `get_study_range_summary`: establishes accessible gaps, derived labels, and daily drill-down.
4. **Learning Progress Dashboard** for `get_learning_progress`: highest information density and highest misleading-percentage risk.
5. Add the compact **recent activity** and **deck** variants only after their parent families are stable.
6. Leave **connection status** native unless user testing demonstrates a real comprehension problem.

The acceptance test for each custom view is the same: a learner should answer its primary question without reading raw JSON, while a non-UI MCP client receives the unchanged structured facts. Every graph must have an accessible textual/table equivalent, and every partial or sparse result must remain visibly distinguishable from a recorded zero.
