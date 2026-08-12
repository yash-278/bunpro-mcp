import * as z from "zod/v4";

export const BunproUserResponseSchema = z.object({
  user: z.object({
    data: z.object({
      attributes: z.object({
        time_zone_iana: z.string().min(1)
      }).loose()
    }).loose()
  }).loose()
}).loose();

export const ConnectionStatusOutputSchema = z.object({
  connected: z.literal(true),
  authentication_method: z.literal("account_api_token"),
  token_source: z.enum(["environment", "request_bearer"]),
  token_persisted_by_server: z.literal(false),
  api_authenticated: z.literal(true),
  source_timezone: z.string().min(1),
  stateless: z.literal(true)
});

export type ConnectionStatus = z.infer<typeof ConnectionStatusOutputSchema>;
export type TokenSource = ConnectionStatus["token_source"];

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format.");

export const StudyDayInputSchema = z.object({
  date: IsoDateSchema.describe("Bunpro calendar day in YYYY-MM-DD format."),
  expected_timezone: z.string().min(1).optional().describe(
    "Optional IANA timezone to compare with the Bunpro account timezone."
  )
}).strict();

export const StudyRangeInputSchema = z.object({
  start_date: IsoDateSchema.describe("First inclusive Bunpro calendar day."),
  end_date: IsoDateSchema.describe("Last inclusive Bunpro calendar day, at most 93 days after the start."),
  expected_timezone: z.string().min(1).optional().describe(
    "Optional IANA timezone to compare with the Bunpro account timezone."
  )
}).strict();

export const DailyCountEvidenceSchema = z.object({
  coverage: z.enum(["available", "no_source_record", "unavailable"]),
  grammar: z.number().int().nonnegative().nullable(),
  vocabulary: z.number().int().nonnegative().nullable(),
  source_total: z.number().int().nonnegative().nullable(),
  component_sum: z.number().int().nonnegative().nullable(),
  consistency: z.enum(["match", "mismatch", "not_comparable"])
});

export const AccuracyEvidenceSchema = z.object({
  coverage: z.enum(["available", "no_source_record", "unavailable"]),
  percent: z.number().nullable()
});

export const SourceCoverageSchema = z.object({
  status: z.enum(["available", "contract_changed", "rate_limited", "upstream_unavailable", "not_queried"]),
  first_record_date: IsoDateSchema.nullable(),
  last_record_date: IsoDateSchema.nullable()
});

export const StudyDayEvidenceSchema = z.object({
  study_day: IsoDateSchema,
  in_progress: z.boolean(),
  activity_evidence: z.enum(["recorded", "no_source_record", "unavailable"]),
  reviews: DailyCountEvidenceSchema,
  new_content: DailyCountEvidenceSchema,
  accuracy: AccuracyEvidenceSchema
});

export const StudyDaySummaryOutputSchema = StudyDayEvidenceSchema.extend({
  source_timezone: z.string().min(1),
  expected_timezone: z.string().min(1).nullable(),
  timezone_matches: z.boolean().nullable(),
  overall_query_status: z.enum(["complete", "partial"]),
  source_coverage: z.object({
    reviews: SourceCoverageSchema,
    new_content: SourceCoverageSchema,
    accuracy: SourceCoverageSchema
  }),
  unavailable_measures: z.array(z.string())
});

export const StudyRangeSummaryOutputSchema = z.object({
  requested_start_date: IsoDateSchema,
  requested_end_date: IsoDateSchema,
  source_timezone: z.string().min(1),
  expected_timezone: z.string().min(1).nullable(),
  timezone_matches: z.boolean().nullable(),
  overall_query_status: z.enum(["complete", "partial"]),
  days: z.array(StudyDayEvidenceSchema).max(93),
  aggregates: z.object({
    reviews: z.object({
      source_record_days: z.number().int().nonnegative(),
      source_total: z.number().int().nonnegative()
    }),
    new_content: z.object({
      source_record_days: z.number().int().nonnegative(),
      source_total: z.number().int().nonnegative()
    }),
    accuracy: z.object({
      source_record_days: z.number().int().nonnegative(),
      average_percent: z.number().nullable()
    })
  }),
  contiguous_checked_through: z.object({
    activity: IsoDateSchema.nullable(),
    accuracy: IsoDateSchema.nullable(),
    all_sources: IsoDateSchema.nullable()
  }),
  source_coverage: z.object({
    reviews: SourceCoverageSchema,
    new_content: SourceCoverageSchema,
    accuracy: SourceCoverageSchema
  }),
  unavailable_measures: z.array(z.string())
});

export type StudyDayInput = z.infer<typeof StudyDayInputSchema>;
export type StudyDaySummary = z.infer<typeof StudyDaySummaryOutputSchema>;
export type StudyDayEvidence = z.infer<typeof StudyDayEvidenceSchema>;
export type StudyRangeInput = z.infer<typeof StudyRangeInputSchema>;
export type StudyRangeSummary = z.infer<typeof StudyRangeSummaryOutputSchema>;
