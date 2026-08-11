#!/usr/bin/env ruby

require "date"
require "json"
require_relative "bunpro_session"

ATLAS_TIMEZONE = "Asia/Kolkata"

def parse_json_response(session, path)
  response = session.api_get(path)
  raise "Bunpro endpoint did not return success" unless response.code.to_i.between?(200, 299)

  JSON.parse(response.body)
end

def value_for_date(payload, section, date)
  values = payload.fetch(section, {})
  values.key?(date) ? values[date] : nil
end

def temporal_coverage(payload)
  keys = if payload.is_a?(Hash) && payload.values.all? { |value| value.is_a?(Hash) }
    payload.values.flat_map(&:keys)
  elsif payload.is_a?(Hash)
    payload.keys
  else
    []
  end

  date_keys = keys.map(&:to_s).grep(/\A\d{4}-\d{2}-\d{2}\z/).sort
  {
    first_key: date_keys.first,
    last_key: date_keys.last,
    distinct_active_dates: date_keys.uniq.length
  }
end

begin
  date = ARGV.fetch(0) { raise ArgumentError, "Pass a Study Day in YYYY-MM-DD format" }
  Date.iso8601(date)

  session = BunproSession.new(**bunpro_credentials).login!
  user = parse_json_response(session, "/api/frontend/user")
  review_heatmap = parse_json_response(session, "/api/frontend/user_stats/review_heatmap")
  new_content_heatmap = parse_json_response(session, "/api/frontend/user_stats/new_content_heatmap")
  accuracy_over_time = parse_json_response(session, "/api/frontend/user_stats/accuracy_over_time")

  user_attributes = user.dig("user", "data", "attributes") || {}
  source_timezone = user_attributes["time_zone_iana"]

  puts JSON.pretty_generate(
    study_day: date,
    source_timezone: source_timezone,
    atlas_timezone: ATLAS_TIMEZONE,
    timezone_matches_atlas: source_timezone == ATLAS_TIMEZONE,
    reviews: {
      grammar: value_for_date(review_heatmap, "grammar", date),
      vocab: value_for_date(review_heatmap, "vocab", date),
      total: value_for_date(review_heatmap, "mixed", date),
      source_record_present: review_heatmap.fetch("mixed", {}).key?(date)
    },
    new_content: {
      grammar: value_for_date(new_content_heatmap, "grammar", date),
      vocab: value_for_date(new_content_heatmap, "vocab", date),
      total: value_for_date(new_content_heatmap, "mixed", date),
      source_record_present: new_content_heatmap.fetch("mixed", {}).key?(date)
    },
    accuracy_percent: accuracy_over_time.key?(date) ? accuracy_over_time[date] : nil,
    accuracy_source_record_present: accuracy_over_time.key?(date),
    coverage: {
      reviews: temporal_coverage(review_heatmap),
      new_content: temporal_coverage(new_content_heatmap),
      accuracy: temporal_coverage(accuracy_over_time)
    },
    unavailable: [
      "study duration for the requested day",
      "complete item-level history for arbitrary historical days",
      "exact correct and incorrect counts for the requested day"
    ],
    sources: [
      "/api/frontend/user_stats/review_heatmap",
      "/api/frontend/user_stats/new_content_heatmap",
      "/api/frontend/user_stats/accuracy_over_time"
    ]
  )
rescue KeyError, ArgumentError => error
  warn "Invalid Study Day input: #{error.class}"
  exit 2
rescue StandardError => error
  warn "Bunpro Study Day probe failed: #{error.class}"
  warn Array(error.backtrace).first(8)
  exit 1
end
