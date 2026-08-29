import * as z from "zod/v4";
import {
  type BunproRequestGate,
  type FetchLike,
  validateApiToken
} from "./client.js";
import { BunproError } from "./errors.js";
import type { TokenSource } from "./schemas.js";

export type { FetchLike } from "./client.js";

const ACCOUNT_CONTEXT_ROUTE = "/api/frontend/user";
const REVIEW_HISTORY_ROUTE = "/api/frontend/user_stats/review_heatmap";
const NEW_CONTENT_HISTORY_ROUTE = "/api/frontend/user_stats/new_content_heatmap";
const ACCURACY_HISTORY_ROUTE = "/api/frontend/user_stats/accuracy_over_time";
const DUE_ROUTE = "/api/frontend/user/due";
const FORECAST_ROUTE = "/api/frontend/user_stats/forecast_daily";
const DECK_CONFIGURATION_ROUTE = "/api/frontend/user/queue";
const LATEST_ACTIVITY_ROUTE = "/api/frontend/user_stats/last_done_reviews";
const LAST_24_HOURS_ACTIVITY_ROUTE = "/api/frontend/summary/last_24_hours";
const BASE_STATS_ROUTE = "/api/frontend/user_stats/base_stats";
const JLPT_PROGRESS_ROUTE = "/api/frontend/user_stats/jlpt_progress_mixed";
const TOTAL_REVIEW_STATS_ROUTE = "/api/frontend/user_stats/total_review_stats";
const TOTAL_CRAM_STATS_ROUTE = "/api/frontend/user_stats/total_cram_stats";
const API_ORIGIN = "https://api.bunpro.jp";
const FRONTEND_API_PREFIX = "/api/frontend/";
const ACCOUNT_TOKEN_OPT_IN = "dangerously_authenticate_using_api_token";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const JLPT_LEVELS = [
  ["5", "N5"],
  ["4", "N4"],
  ["3", "N3"],
  ["2", "N2"],
  ["1", "N1"]
] as const;

const AccountContextResponseSchema = z.object({
  user: z.object({
    data: z.object({
      attributes: z.object({
        time_zone_iana: z.string().min(1)
      }).loose()
    }).loose()
  }).loose()
}).loose();

const DailyCountMapSchema = z.record(z.string(), z.number().int().nonnegative());
const DailyCountSeriesResponseSchema = z.object({
  grammar: DailyCountMapSchema,
  vocab: DailyCountMapSchema,
  mixed: DailyCountMapSchema
});
const AccuracySeriesResponseSchema = z.record(z.string(), z.number().nullable());
const DueResponseSchema = z.object({
  total_due_grammar: z.number().int().nonnegative(),
  total_due_vocab: z.number().int().nonnegative()
}).loose();
const ForecastMapSchema = z.record(z.string(), z.number().int().nonnegative());
const ForecastResponseSchema = z.object({
  grammar: ForecastMapSchema,
  vocab: ForecastMapSchema
});
const UserDeckResponseSchema = z.object({
  id: z.string(),
  attributes: z.object({
    deck_id: z.number().int().nonnegative(),
    actively_studying: z.boolean(),
    batch_size: z.number().int().nonnegative(),
    daily_goal: z.number().int().nonnegative(),
    daily_goal_count_grammar: z.number().int().nonnegative(),
    daily_goal_count_vocab: z.number().int().nonnegative(),
    complete_grammar_count: z.number().int().nonnegative(),
    complete_vocab_count: z.number().int().nonnegative()
  }).loose()
}).loose();
const DeckMetadataResponseSchema = z.object({
  id: z.string(),
  attributes: z.object({
    title: z.string(),
    slug: z.string(),
    deck_type: z.string(),
    grammar_count: z.number().int().nonnegative(),
    vocab_count: z.number().int().nonnegative()
  }).loose()
}).loose();
const DeckConfigurationResponseSchema = z.object({
  data: z.array(UserDeckResponseSchema),
  included: z.array(DeckMetadataResponseSchema)
});
const AttemptResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  time: z.string().min(1),
  status: z.boolean(),
  reviewable: z.object({
    data: z.object({
      id: z.union([z.string(), z.number()]),
      type: z.string().min(1),
      attributes: z.object({
        title: z.string().optional(),
        slug: z.string().optional()
      }).loose()
    }).loose()
  }).loose()
}).loose();
const ReviewSessionResponseSchema = z.object({
  attributes: z.object({
    starting_xp: z.number().int(),
    ending_xp: z.number().int(),
    starting_buncoin: z.number().int(),
    ending_buncoin: z.number().int()
  }).loose()
}).loose();
const Last24HoursActivityResponseSchema = z.object({
  history_objects: z.array(AttemptResponseSchema),
  review_sessions: z.object({ data: z.array(ReviewSessionResponseSchema) }).loose()
}).loose();
const LatestActivityResponseSchema = z.array(AttemptResponseSchema);
const StageCountsResponseSchema = z.object({
  beginner: z.number().int().nonnegative(),
  seasoned: z.number().int().nonnegative(),
  adept: z.number().int().nonnegative(),
  expert: z.number().int().nonnegative(),
  master: z.number().int().nonnegative(),
  total_count: z.number().int().nonnegative()
}).loose();
const ReviewAggregateResponseSchema = z.object({
  accuracy: z.number().min(0).max(100),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  total: z.number().int().nonnegative()
}).loose();
const BaseStatsResponseSchema = z.object({
  facts: z.object({
    days_studied: z.number().int().nonnegative(),
    grammar_studied: z.number().int().nonnegative(),
    vocab_studied: z.number().int().nonnegative(),
    streak: z.number().int().nonnegative(),
    weekly_streak: z.array(z.object({
      day: z.string(),
      val: z.boolean()
    }).loose()).max(7)
  }).loose()
}).loose();
const JlptProgressResponseSchema = z.object({
  grammar: z.record(z.string(), StageCountsResponseSchema),
  vocab: z.record(z.string(), StageCountsResponseSchema)
});
const TotalReviewStatsResponseSchema = z.object({
  grammar: z.record(z.string(), ReviewAggregateResponseSchema),
  vocab: z.record(z.string(), ReviewAggregateResponseSchema),
  mixed: z.record(z.string(), ReviewAggregateResponseSchema)
});
const TotalCramStatsResponseSchema = z.object({
  items: ReviewAggregateResponseSchema,
  sessions: z.object({
    average_time: z.string(),
    reviews_per_session: z.number().int().nonnegative(),
    session_count: z.number().int().nonnegative(),
    total_time: z.string()
  }).loose()
});

export interface AccountContext {
  sourceTimezone: string;
  tokenSource: TokenSource;
}

export interface DailyCountSeries {
  grammar: Record<string, number>;
  vocabulary: Record<string, number>;
  mixed: Record<string, number>;
}

export type SourceOutcome<T> =
  | { status: "available"; data: T }
  | { status: "contract_changed" | "rate_limited" | "upstream_unavailable" | "not_queried" };

export interface StudyHistorySnapshot {
  accountContext: AccountContext;
  reviews: SourceOutcome<DailyCountSeries>;
  newContent: SourceOutcome<DailyCountSeries>;
  accuracy: SourceOutcome<Record<string, number | null>>;
}

export interface ReviewCounts {
  grammar: number;
  vocabulary: number;
}

export interface ReviewPlanningSnapshot {
  accountContext: AccountContext;
  dueNow: ReviewCounts;
  forecast: {
    laterToday: ReviewCounts;
    tomorrow: ReviewCounts;
    dated: Array<ReviewCounts & { date: string }>;
  };
}

export interface DeckConfigurationFact {
  deckId: string;
  title: string;
  slug: string;
  deckType: string;
  activelyStudying: boolean;
  batchSize: number;
  dailyGoal: number;
  dailyGoalProgress: ReviewCounts;
  completed: ReviewCounts;
  content: ReviewCounts;
}

export interface DeckConfigurationSnapshot {
  accountContext: AccountContext;
  decks: DeckConfigurationFact[];
}

export type RecentActivityView = "last_24_hours" | "latest_attempts";

export interface RecentAttemptFact {
  attemptId: string;
  time: string;
  correct: boolean;
  contentType: string;
  contentId: string;
  label: string | null;
}

export interface RecentSessionFact {
  startingXp: number;
  endingXp: number;
  startingBuncoin: number;
  endingBuncoin: number;
}

export interface RecentActivitySnapshot {
  accountContext: AccountContext;
  view: RecentActivityView;
  attempts: RecentAttemptFact[];
  sessions: RecentSessionFact[] | null;
}

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface StageCountsFact {
  beginner: number;
  seasoned: number;
  adept: number;
  expert: number;
  master: number;
  totalCount: number;
}

export interface ReviewAggregateFact {
  accuracy: number;
  correct: number;
  incorrect: number;
  total: number;
}

export interface LearningProgressSnapshot {
  accountContext: AccountContext;
  base: {
    daysStudied: number;
    grammarStudied: number;
    vocabularyStudied: number;
    currentStreak: number;
    weeklyStreak: Array<{ day: string; studied: boolean }>;
  };
  jlptProgress: {
    grammar: Record<JlptLevel, StageCountsFact>;
    vocabulary: Record<JlptLevel, StageCountsFact>;
  };
  reviewTotals: {
    grammar: Record<JlptLevel, ReviewAggregateFact>;
    vocabulary: Record<JlptLevel, ReviewAggregateFact>;
    mixed: Record<JlptLevel, ReviewAggregateFact>;
  };
  cram: {
    items: ReviewAggregateFact;
    sessions: {
      averageTime: string;
      reviewsPerSession: number;
      sessionCount: number;
      totalTime: string;
    };
  };
}

export interface FrontendSource {
  getAccountContext(operationSignal?: AbortSignal): Promise<AccountContext>;
  loadStudyHistory(operationSignal?: AbortSignal): Promise<StudyHistorySnapshot>;
  loadReviewPlanning(operationSignal?: AbortSignal): Promise<ReviewPlanningSnapshot>;
  loadDeckConfiguration(operationSignal?: AbortSignal): Promise<DeckConfigurationSnapshot>;
  loadRecentActivity(
    view: RecentActivityView,
    operationSignal?: AbortSignal
  ): Promise<RecentActivitySnapshot>;
  loadLearningProgress(operationSignal?: AbortSignal): Promise<LearningProgressSnapshot>;
}

export type FrontendSourceOperationFactory = () => FrontendSource;

export interface FrontendSourceOptions {
  tokenSource?: TokenSource;
  requestGate?: BunproRequestGate;
  requestTimeoutMs?: number;
  maximumResponseBytes?: number;
}

export function createFrontendSourceOperationFactory(
  apiToken: () => string,
  fetchImplementation: FetchLike = fetch,
  options: FrontendSourceOptions = {}
): FrontendSourceOperationFactory {
  return () => new BunproFrontendSource(apiToken(), fetchImplementation, options);
}

export class BunproFrontendSource implements FrontendSource {
  readonly #transport: FrontendHttpTransport;
  readonly #tokenSource: TokenSource;
  #accountContext: Promise<AccountContext> | undefined;

  constructor(
    apiToken: string,
    fetchImplementation: FetchLike = fetch,
    options: FrontendSourceOptions = {}
  ) {
    this.#transport = new FrontendHttpTransport(apiToken, fetchImplementation, options);
    this.#tokenSource = options.tokenSource ?? "environment";
  }

  getAccountContext(operationSignal?: AbortSignal): Promise<AccountContext> {
    this.#accountContext ??= this.#loadAccountContext(operationSignal);
    return this.#accountContext;
  }

  async loadStudyHistory(operationSignal?: AbortSignal): Promise<StudyHistorySnapshot> {
    const accountContext = await this.getAccountContext(operationSignal);
    const reviews = await this.#loadSourceOutcome(
      REVIEW_HISTORY_ROUTE,
      DailyCountSeriesResponseSchema,
      normalizeDailyCountSeries,
      operationSignal
    );
    const newContent = reviews.status === "rate_limited"
      ? { status: "not_queried" } as const
      : await this.#loadSourceOutcome(
        NEW_CONTENT_HISTORY_ROUTE,
        DailyCountSeriesResponseSchema,
        normalizeDailyCountSeries,
        operationSignal
      );
    const accuracy = reviews.status === "rate_limited" || newContent.status === "rate_limited"
      ? { status: "not_queried" } as const
      : await this.#loadSourceOutcome(
        ACCURACY_HISTORY_ROUTE,
        AccuracySeriesResponseSchema,
        value => value,
        operationSignal
      );
    return { accountContext, reviews, newContent, accuracy };
  }

  async loadReviewPlanning(operationSignal?: AbortSignal): Promise<ReviewPlanningSnapshot> {
    const accountContext = await this.getAccountContext(operationSignal);
    const due = await this.#loadRequired(
      DUE_ROUTE,
      DueResponseSchema,
      "due counts",
      operationSignal
    );
    const forecast = await this.#loadRequired(
      FORECAST_ROUTE,
      ForecastResponseSchema,
      "daily forecast",
      operationSignal
    );
    const grammarKeys = Object.keys(forecast.grammar).sort();
    const vocabularyKeys = Object.keys(forecast.vocab).sort();
    if (
      grammarKeys.join("\0") !== vocabularyKeys.join("\0")
      || !Object.hasOwn(forecast.grammar, "later")
      || !Object.hasOwn(forecast.grammar, "tomorrow")
    ) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro returned inconsistent grammar and vocabulary forecast buckets."
      );
    }
    const countsFor = (key: string): ReviewCounts => ({
      grammar: forecast.grammar[key] ?? 0,
      vocabulary: forecast.vocab[key] ?? 0
    });
    return {
      accountContext,
      dueNow: {
        grammar: due.total_due_grammar,
        vocabulary: due.total_due_vocab
      },
      forecast: {
        laterToday: countsFor("later"),
        tomorrow: countsFor("tomorrow"),
        dated: grammarKeys
          .filter(key => key !== "later" && key !== "tomorrow")
          .map(date => ({ date, ...countsFor(date) }))
      }
    };
  }

  async loadDeckConfiguration(operationSignal?: AbortSignal): Promise<DeckConfigurationSnapshot> {
    const accountContext = await this.getAccountContext(operationSignal);
    const response = await this.#loadRequired(
      DECK_CONFIGURATION_ROUTE,
      DeckConfigurationResponseSchema,
      "study-deck configuration",
      operationSignal
    );
    const metadataById = new Map(response.included.map(deck => [deck.id, deck.attributes]));
    const decks = response.data.map(userDeck => {
      const deckId = String(userDeck.attributes.deck_id);
      const metadata = metadataById.get(deckId);
      if (!metadata) {
        throw new BunproError(
          "BUNPRO_CONTRACT_CHANGED",
          "Bunpro returned study-deck configuration without matching deck metadata."
        );
      }
      return {
        deckId,
        title: metadata.title,
        slug: metadata.slug,
        deckType: metadata.deck_type,
        activelyStudying: userDeck.attributes.actively_studying,
        batchSize: userDeck.attributes.batch_size,
        dailyGoal: userDeck.attributes.daily_goal,
        dailyGoalProgress: {
          grammar: userDeck.attributes.daily_goal_count_grammar,
          vocabulary: userDeck.attributes.daily_goal_count_vocab
        },
        completed: {
          grammar: userDeck.attributes.complete_grammar_count,
          vocabulary: userDeck.attributes.complete_vocab_count
        },
        content: {
          grammar: metadata.grammar_count,
          vocabulary: metadata.vocab_count
        }
      };
    });
    return { accountContext, decks };
  }

  async loadRecentActivity(
    view: RecentActivityView,
    operationSignal?: AbortSignal
  ): Promise<RecentActivitySnapshot> {
    const accountContext = await this.getAccountContext(operationSignal);
    let attempts: z.infer<typeof AttemptResponseSchema>[];
    let sessions: z.infer<typeof ReviewSessionResponseSchema>[] | null;
    if (view === "last_24_hours") {
      const response = await this.#loadRequired(
        LAST_24_HOURS_ACTIVITY_ROUTE,
        Last24HoursActivityResponseSchema,
        "last-24-hours activity",
        operationSignal
      );
      attempts = response.history_objects;
      sessions = response.review_sessions.data;
    } else {
      attempts = await this.#loadRequired(
        LATEST_ACTIVITY_ROUTE,
        LatestActivityResponseSchema,
        "latest review attempts",
        operationSignal
      );
      sessions = null;
    }
    return {
      accountContext,
      view,
      attempts: attempts.map(attempt => ({
        attemptId: String(attempt.id),
        time: attempt.time,
        correct: attempt.status,
        contentType: attempt.reviewable.data.type,
        contentId: String(attempt.reviewable.data.id),
        label: attempt.reviewable.data.attributes.title
          ?? attempt.reviewable.data.attributes.slug
          ?? null
      })),
      sessions: sessions?.map(session => ({
        startingXp: session.attributes.starting_xp,
        endingXp: session.attributes.ending_xp,
        startingBuncoin: session.attributes.starting_buncoin,
        endingBuncoin: session.attributes.ending_buncoin
      })) ?? null
    };
  }

  async loadLearningProgress(operationSignal?: AbortSignal): Promise<LearningProgressSnapshot> {
    const accountContext = await this.getAccountContext(operationSignal);
    const base = await this.#loadRequired(
      BASE_STATS_ROUTE,
      BaseStatsResponseSchema,
      "base statistics",
      operationSignal
    );
    const jlpt = await this.#loadRequired(
      JLPT_PROGRESS_ROUTE,
      JlptProgressResponseSchema,
      "JLPT progress",
      operationSignal
    );
    const reviews = await this.#loadRequired(
      TOTAL_REVIEW_STATS_ROUTE,
      TotalReviewStatsResponseSchema,
      "total review statistics",
      operationSignal
    );
    const cram = await this.#loadRequired(
      TOTAL_CRAM_STATS_ROUTE,
      TotalCramStatsResponseSchema,
      "total cram statistics",
      operationSignal
    );
    assertJlptGroups(
      jlpt.grammar,
      jlpt.vocab,
      reviews.grammar,
      reviews.vocab,
      reviews.mixed
    );
    return {
      accountContext,
      base: {
        daysStudied: base.facts.days_studied,
        grammarStudied: base.facts.grammar_studied,
        vocabularyStudied: base.facts.vocab_studied,
        currentStreak: base.facts.streak,
        weeklyStreak: base.facts.weekly_streak.map(day => ({
          day: day.day,
          studied: day.val
        }))
      },
      jlptProgress: {
        grammar: normalizeJlptGroup(jlpt.grammar, normalizeStageCounts),
        vocabulary: normalizeJlptGroup(jlpt.vocab, normalizeStageCounts)
      },
      reviewTotals: {
        grammar: normalizeJlptGroup(reviews.grammar, normalizeReviewAggregate),
        vocabulary: normalizeJlptGroup(reviews.vocab, normalizeReviewAggregate),
        mixed: normalizeJlptGroup(reviews.mixed, normalizeReviewAggregate)
      },
      cram: {
        items: normalizeReviewAggregate(cram.items),
        sessions: {
          averageTime: cram.sessions.average_time,
          reviewsPerSession: cram.sessions.reviews_per_session,
          sessionCount: cram.sessions.session_count,
          totalTime: cram.sessions.total_time
        }
      }
    };
  }

  async #loadAccountContext(operationSignal?: AbortSignal): Promise<AccountContext> {
    const payload = await this.#transport.getJson(ACCOUNT_CONTEXT_ROUTE, operationSignal);
    const parsed = AccountContextResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro accepted the Account API Token, but the user response shape changed. Update the MCP before using study data."
      );
    }
    return {
      sourceTimezone: parsed.data.user.data.attributes.time_zone_iana,
      tokenSource: this.#tokenSource
    };
  }

  async #loadSourceOutcome<TWire, TFact>(
    route: string,
    schema: z.ZodType<TWire>,
    normalize: (value: TWire) => TFact,
    operationSignal?: AbortSignal
  ): Promise<SourceOutcome<TFact>> {
    try {
      const payload = await this.#transport.getJson(route, operationSignal);
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new BunproError(
          "BUNPRO_CONTRACT_CHANGED",
          "Bunpro accepted the Account API Token, but a Study History response shape changed."
        );
      }
      return { status: "available", data: normalize(parsed.data) };
    } catch (error) {
      if (!(error instanceof BunproError)) throw error;
      if (error.code === "BUNPRO_AUTH_FAILED" || error.code === "BUNPRO_BUSY") throw error;
      if (error.code === "BUNPRO_RATE_LIMITED") return { status: "rate_limited" };
      if (error.code === "BUNPRO_CONTRACT_CHANGED") return { status: "contract_changed" };
      return { status: "upstream_unavailable" };
    }
  }

  async #loadRequired<T>(
    route: string,
    schema: z.ZodType<T>,
    name: string,
    operationSignal?: AbortSignal
  ): Promise<T> {
    const payload = await this.#transport.getJson(route, operationSignal);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        `Bunpro accepted the Account API Token, but the ${name} response shape changed.`
      );
    }
    return parsed.data;
  }
}

class FrontendHttpTransport {
  readonly #apiToken: string;
  readonly #fetch: FetchLike;
  readonly #requestGate: BunproRequestGate | undefined;
  readonly #requestTimeoutMs: number;
  readonly #maximumResponseBytes: number;

  constructor(
    apiToken: string,
    fetchImplementation: FetchLike,
    options: FrontendSourceOptions
  ) {
    this.#apiToken = validateApiToken(apiToken);
    this.#fetch = fetchImplementation;
    this.#requestGate = options.requestGate;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
    this.#maximumResponseBytes = options.maximumResponseBytes ?? MAX_RESPONSE_BYTES;
  }

  async getJson(path: string, operationSignal?: AbortSignal): Promise<unknown> {
    const url = new URL(path, API_ORIGIN);
    if (url.origin !== API_ORIGIN || !url.pathname.startsWith(FRONTEND_API_PREFIX)) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "The Bunpro source only permits its fixed read-only Frontend API routes."
      );
    }
    url.searchParams.set(ACCOUNT_TOKEN_OPT_IN, "true");
    const response = await this.#request(url, {
      method: "GET",
      ...(operationSignal ? { signal: operationSignal } : {}),
      headers: {
        accept: "application/json",
        authorization: `Token token=${this.#apiToken}`,
        origin: "https://bunpro.jp",
        referer: "https://bunpro.jp/",
        "user-agent": "bunpro-mcp-server/0.4"
      }
    });
    this.#ensureApiSuccess(response);
    return this.#readJson(response);
  }

  #ensureApiSuccess(response: Response): void {
    if (response.status === 401 || response.status === 403) {
      throw new BunproError(
        "BUNPRO_AUTH_FAILED",
        "Bunpro rejected the Account API Token. Configure a current token from Bunpro Settings > API."
      );
    }
    if (response.status === 429) {
      throw new BunproError(
        "BUNPRO_RATE_LIMITED",
        "Bunpro rate-limited the request. Wait before trying again; the MCP will not retry automatically."
      );
    }
    if (response.status === 404) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "The Bunpro Frontend API route is unavailable. Bunpro may have changed or restricted its temporary route whitelist."
      );
    }
    if (!response.ok) {
      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        `Bunpro's frontend API returned HTTP ${response.status}. Try again later.`
      );
    }
  }

  async #request(url: URL, init: RequestInit): Promise<Response> {
    const timeoutController = new AbortController();
    const timeout = setTimeout(
      () => timeoutController.abort(new DOMException("The Bunpro request timed out.", "TimeoutError")),
      this.#requestTimeoutMs
    );
    try {
      const request = (): Promise<Response> => this.#fetch(url, {
        ...init,
        signal: init.signal
          ? AbortSignal.any([init.signal, timeoutController.signal])
          : timeoutController.signal
      });
      return await (this.#requestGate ? this.#requestGate.run(request) : request());
    } catch (error) {
      if (error instanceof BunproError) throw error;
      throw new BunproError(
        "BUNPRO_UPSTREAM_UNAVAILABLE",
        "Bunpro could not be reached before the request timeout. Try again later.",
        { cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async #readJson(response: Response): Promise<unknown> {
    try {
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > this.#maximumResponseBytes) {
        throw new RangeError("Bunpro response exceeds the configured byte limit.");
      }
      const body = await response.arrayBuffer();
      if (body.byteLength > this.#maximumResponseBytes) {
        throw new RangeError("Bunpro response exceeds the configured byte limit.");
      }
      return JSON.parse(new TextDecoder().decode(body));
    } catch (error) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro accepted the Account API Token, but the API response was not valid JSON.",
        { cause: error }
      );
    }
  }
}

function assertJlptGroups(...groups: Array<Record<string, unknown>>): void {
  if (groups.some(group => Object.keys(group).sort().join(",") !== "1,2,3,4,5")) {
    throw new BunproError(
      "BUNPRO_CONTRACT_CHANGED",
      "Bunpro returned unexpected JLPT level groups."
    );
  }
}

function normalizeJlptGroup<TWire, TFact>(
  group: Record<string, TWire>,
  normalize: (value: TWire) => TFact
): Record<JlptLevel, TFact> {
  return Object.fromEntries(JLPT_LEVELS.map(([sourceLevel, level]) => {
    const value = group[sourceLevel];
    if (value === undefined) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro omitted a required JLPT level."
      );
    }
    return [level, normalize(value)];
  })) as Record<JlptLevel, TFact>;
}

function normalizeStageCounts(value: z.infer<typeof StageCountsResponseSchema>): StageCountsFact {
  return {
    beginner: value.beginner,
    seasoned: value.seasoned,
    adept: value.adept,
    expert: value.expert,
    master: value.master,
    totalCount: value.total_count
  };
}

function normalizeDailyCountSeries(
  value: z.infer<typeof DailyCountSeriesResponseSchema>
): DailyCountSeries {
  return {
    grammar: value.grammar,
    vocabulary: value.vocab,
    mixed: value.mixed
  };
}

function normalizeReviewAggregate(
  value: z.infer<typeof ReviewAggregateResponseSchema>
): ReviewAggregateFact {
  return {
    accuracy: value.accuracy,
    correct: value.correct,
    incorrect: value.incorrect,
    total: value.total
  };
}
