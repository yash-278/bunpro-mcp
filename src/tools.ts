import * as z from "zod/v4";
import type { FrontendSource } from "./bunpro/frontend-source.js";
import { getRecentActivity, getReviewSchedule, listStudyDecks, listWeakSpots } from "./bunpro/planning.js";
import { getLearningProgress } from "./bunpro/progress.js";
import {
  ActivityTrendOutputSchema,
  ConnectionStatusOutputSchema,
  LearningProgressOutputSchema,
  ListStudyDecksInputSchema,
  ListStudyDecksOutputSchema,
  ListWeakSpotsInputSchema,
  ListWeakSpotsOutputSchema,
  RecentActivityInputSchema,
  RecentActivityOutputSchema,
  ReviewScheduleOutputSchema,
  StudyDayInputSchema,
  StudyDaySummaryOutputSchema,
  StudyRangeInputSchema,
  StudyRangeSummaryOutputSchema,
  type ConnectionStatus
} from "./bunpro/schemas.js";
import { MAX_STUDY_PERIOD_DAYS } from "./bunpro/study-period.js";
import { getActivityTrend, getStudyDaySummary, getStudyRangeSummary } from "./bunpro/study.js";

export interface ToolContext {
  source: FrontendSource;
  now: Date;
}

export interface ToolDeclaration<
  Input extends z.ZodObject = z.ZodObject,
  Output extends z.ZodObject = z.ZodObject
> {
  name: string;
  title: string;
  description: string;
  inputSchema: Input;
  outputSchema: Output;
  run(input: z.output<Input>, context: ToolContext): Promise<z.output<Output>>;
}

function declareTool<Input extends z.ZodObject, Output extends z.ZodObject>(
  declaration: ToolDeclaration<Input, Output>
): ToolDeclaration {
  return declaration;
}

const NoInputSchema = z.object({}).strict();

// Tool order is part of the public contract: tools/list returns this order.
export const TOOL_DECLARATIONS: readonly ToolDeclaration[] = [
  declareTool({
    name: "get_connection_status",
    title: "Check Bunpro connection",
    description:
      "Verify that the caller's Bunpro Account API Token can access the read-only Frontend API. The token comes from BUNPRO_API_TOKEN in stdio mode, or from X-Bunpro-Token or Authorization: Bearer in HTTP mode. The MCP never returns or stores the token.",
    inputSchema: NoInputSchema,
    outputSchema: ConnectionStatusOutputSchema,
    run: async (_input, { source }): Promise<ConnectionStatus> => {
      const accountContext = await source.getAccountContext();
      return {
        connected: true,
        authentication_method: "account_api_token",
        token_source: accountContext.tokenSource,
        token_persisted_by_server: false,
        api_authenticated: true,
        source_timezone: accountContext.sourceTimezone,
        stateless: true
      };
    }
  }),
  declareTool({
    name: "get_study_day_summary",
    title: "Get Bunpro Study Day summary",
    description:
      "Return source-backed Bunpro review, new-content, and accuracy evidence for one exact Bunpro calendar day. Missing sparse records remain unknown rather than zero.",
    inputSchema: StudyDayInputSchema,
    outputSchema: StudyDaySummaryOutputSchema,
    run: (input, { source, now }) => getStudyDaySummary(source, input, now)
  }),
  declareTool({
    name: "get_study_range_summary",
    title: "Get Bunpro Study Period summary",
    description:
      `Return one source-backed entry for every inclusive Bunpro calendar day in a range of at most ${MAX_STUDY_PERIOD_DAYS} days, using one bounded set of upstream requests. A null aggregate means no evidence supports it, not zero.`,
    inputSchema: StudyRangeInputSchema,
    outputSchema: StudyRangeSummaryOutputSchema,
    run: (input, { source, now }) => getStudyRangeSummary(source, input, now)
  }),
  declareTool({
    name: "get_review_schedule",
    title: "Get Bunpro review schedule",
    description:
      "Return current grammar and vocabulary reviews due plus Bunpro's forecast from later today through its current daily horizon. Forecast values are projections, not completed study.",
    inputSchema: NoInputSchema,
    outputSchema: ReviewScheduleOutputSchema,
    run: (_input, { source, now }) => getReviewSchedule(source, now)
  }),
  declareTool({
    name: "list_study_decks",
    title: "List Bunpro study decks",
    description:
      "List bounded Bunpro study-deck configuration, goals, progress, and content counts. These are study decks, not queued review items.",
    inputSchema: ListStudyDecksInputSchema,
    outputSchema: ListStudyDecksOutputSchema,
    run: (input, { source }) => listStudyDecks(source, input)
  }),
  declareTool({
    name: "get_recent_activity",
    title: "Get recent Bunpro activity",
    description:
      "Return a bounded rolling last-24-hours view or latest-attempts view. The source does not guarantee complete history or pagination.",
    inputSchema: RecentActivityInputSchema,
    outputSchema: RecentActivityOutputSchema,
    run: (input, { source }) => getRecentActivity(source, input)
  }),
  declareTool({
    name: "get_learning_progress",
    title: "Get Bunpro learning progress",
    description:
      "Return normalized account study facts, JLPT N5-N1 SRS-stage progress, JLPT review totals, and cram aggregates without badge or profile details.",
    inputSchema: NoInputSchema,
    outputSchema: LearningProgressOutputSchema,
    run: (_input, { source, now }) => getLearningProgress(source, now)
  }),
  declareTool({
    name: "get_activity_trend",
    title: "Get Bunpro activity trend",
    description:
      `Return preserved daily review, new-content, and accuracy evidence plus explicitly derived totals and source-present-day averages for a range of at most ${MAX_STUDY_PERIOD_DAYS} days. A null aggregate means no evidence supports it, not zero.`,
    inputSchema: StudyRangeInputSchema,
    outputSchema: ActivityTrendOutputSchema,
    run: (input, { source, now }) => getActivityTrend(source, input, now)
  }),
  declareTool({
    name: "list_weak_spots",
    title: "List Bunpro weak spots",
    description:
      "List the study items Bunpro currently lists as troubled, with the accuracy and streak Bunpro reports for each, lowest accuracy first and null accuracy last. Bunpro's selection rule is unpublished. An empty list means Bunpro lists nothing right now, not that the learner has no weak spots.",
    inputSchema: ListWeakSpotsInputSchema,
    outputSchema: ListWeakSpotsOutputSchema,
    run: (input, { source, now }) => listWeakSpots(source, input, now)
  })
];
