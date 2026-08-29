import type { BunproError } from "./errors.js";
import type {
  AccountContext,
  DeckConfigurationSnapshot,
  FrontendSource,
  LearningProgressSnapshot,
  RecentActivitySnapshot,
  RecentActivityView,
  ReviewPlanningSnapshot,
  StudyHistorySnapshot
} from "./frontend-source.js";

export interface InMemoryFrontendSourceData {
  accountContext: AccountContext;
  studyHistory?: Omit<StudyHistorySnapshot, "accountContext">;
  reviewPlanning?: Omit<ReviewPlanningSnapshot, "accountContext">;
  deckConfiguration?: Omit<DeckConfigurationSnapshot, "accountContext">;
  recentActivity?: Partial<Record<
    RecentActivityView,
    Omit<RecentActivitySnapshot, "accountContext" | "view">
  >>;
  learningProgress?: Omit<LearningProgressSnapshot, "accountContext">;
}

export type FrontendSourceCapability =
  | "accountContext"
  | "studyHistory"
  | "reviewPlanning"
  | "deckConfiguration"
  | "recentActivity"
  | "learningProgress";

export type InMemoryFrontendSourceFailures = Partial<Record<FrontendSourceCapability, BunproError>>;

export class InMemoryFrontendSource implements FrontendSource {
  readonly #data: InMemoryFrontendSourceData;
  readonly #failures: InMemoryFrontendSourceFailures;

  constructor(
    data: InMemoryFrontendSourceData,
    failures: InMemoryFrontendSourceFailures = {}
  ) {
    this.#data = data;
    this.#failures = failures;
  }

  async getAccountContext(): Promise<AccountContext> {
    this.#throwFailure("accountContext");
    return this.#data.accountContext;
  }

  async loadStudyHistory(): Promise<StudyHistorySnapshot> {
    return this.#loadCapability("studyHistory", this.#data.studyHistory);
  }

  async loadReviewPlanning(): Promise<ReviewPlanningSnapshot> {
    return this.#loadCapability("reviewPlanning", this.#data.reviewPlanning);
  }

  async loadDeckConfiguration(): Promise<DeckConfigurationSnapshot> {
    return this.#loadCapability("deckConfiguration", this.#data.deckConfiguration);
  }

  async loadRecentActivity(view: RecentActivityView): Promise<RecentActivitySnapshot> {
    const fixture = this.#data.recentActivity?.[view];
    return this.#loadCapability(
      "recentActivity",
      fixture === undefined ? undefined : { view, ...fixture }
    );
  }

  async loadLearningProgress(): Promise<LearningProgressSnapshot> {
    return this.#loadCapability("learningProgress", this.#data.learningProgress);
  }

  #throwFailure(capability: FrontendSourceCapability): void {
    const failure = this.#failures[capability];
    if (failure) throw failure;
  }

  #required<T>(capability: string, value: T | undefined): T {
    if (value === undefined) {
      throw new TypeError(`Missing in-memory Frontend source fixture for ${capability}.`);
    }
    return value;
  }

  async #loadCapability<T extends object>(
    capability: Exclude<FrontendSourceCapability, "accountContext">,
    value: T | undefined
  ): Promise<T & { accountContext: AccountContext }> {
    const accountContext = await this.getAccountContext();
    this.#throwFailure(capability);
    return {
      accountContext,
      ...this.#required(capability, value)
    };
  }
}
