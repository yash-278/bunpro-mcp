#!/usr/bin/env ruby

require "json"
require "uri"
require_relative "bunpro_session"

PROBE_PATHS = [
  "/api/frontend/user",
  "/api/frontend/user_stats/base_stats",
  "/api/frontend/user_stats/jlpt_progress_mixed",
  "/api/frontend/user_stats/forecast_daily",
  "/api/frontend/user_stats/activity_daily",
  "/api/frontend/user_stats/activity_hourly",
  "/api/frontend/user_stats/review_heatmap",
  "/api/frontend/user_stats/new_content_heatmap",
  "/api/frontend/user_stats/accuracy_over_time",
  "/api/frontend/user_stats/last_done_reviews",
  "/api/frontend/user_stats/total_review_stats",
  "/api/frontend/user_stats/total_cram_stats",
  "/api/frontend/user/due",
  "/api/frontend/user/queue",
  "/api/frontend/summary/last_24_hours"
].freeze

WEB_PAGES = [
  "/dashboard",
  "/profile/stats"
].freeze

DISCOVERY_TERMS = %w[
  accuracy
  activity
  base_stats
  forecast
  heatmap
  history
  last_24_hours
  review
  stats
  summary
].freeze

MAX_SCHEMA_DEPTH = 5

def scalar_type(value)
  case value
  when NilClass then "null"
  when TrueClass, FalseClass then "boolean"
  when Integer then "integer"
  when Float then "number"
  when String then "string"
  else value.class.name
  end
end

def temporal_key_pattern(keys)
  return nil if keys.empty?
  return "YYYY-MM-DD" if keys.all? { |key| key.match?(/\A\d{4}-\d{2}-\d{2}\z/) }
  return "YYYY-MM-DD HH:MM" if keys.all? { |key| key.match?(/\A\d{4}-\d{2}-\d{2} \d{2}:\d{2}\z/) }

  nil
end

def structural_shape(value, depth = 0)
  return scalar_type(value) if depth >= MAX_SCHEMA_DEPTH

  case value
  when Hash
    string_keys = value.keys.map(&:to_s).sort
    temporal_pattern = temporal_key_pattern(string_keys)
    if temporal_pattern
      return {
        type: "temporal_map",
        key_pattern: temporal_pattern,
        key_count: string_keys.length,
        first_key: string_keys.first,
        last_key: string_keys.last,
        value_shapes: value.values.map { |item| structural_shape(item, depth + 1) }.uniq
      }
    end

    {
      type: "object",
      fields: string_keys.to_h do |key|
        original_key = value.key?(key) ? key : value.keys.find { |candidate| candidate.to_s == key }
        [key, structural_shape(value[original_key], depth + 1)]
      end
    }
  when Array
    sample_shapes = value.first(3).map { |item| structural_shape(item, depth + 1) }.uniq
    { type: "array", item_shapes: sample_shapes }
  else
    scalar_type(value)
  end
end

def response_contract(response)
  contract = {
    status: response.code.to_i,
    content_type: response["content-type"].to_s.split(";", 2).first,
    rate_limit_headers: response.each_header.map { |name, _value| name }.grep(/rate.?limit|retry-after/i).sort,
    pagination_headers: response.each_header.map { |name, _value| name }.grep(/\Alink\z|cursor|page/i).sort
  }

  if response.code.to_i.between?(200, 299) && contract[:content_type].include?("json")
    contract[:shape] = structural_shape(JSON.parse(response.body))
  end

  contract
rescue JSON::ParserError
  contract.merge(json_parse: "failed")
end

def dashboard_asset_sources(html)
  html.to_s.scan(/<script[^>]+src=["']([^"']+)["']/i).flatten.uniq.map do |source|
    uri = URI.join(BunproSession::WEB_ORIGIN, source)
    uri.to_s if uri.host == URI(BunproSession::WEB_ORIGIN).host
  rescue URI::InvalidURIError
    nil
  end.compact
end

def get_web_following_redirects(session, path, limit: 3)
  response = session.web_get(path)

  limit.times do
    break unless response.is_a?(Net::HTTPRedirection) && response["location"]

    response = session.web_get(response["location"])
  end

  response
end

def frontend_paths(source)
  source.scan(%r{/api/frontend/[A-Za-z0-9_./?=&%${}:,-]+}).map do |path|
    path.sub(/[),;]+\z/, "")
  end
end

def api_hints(source)
  candidates = source.scan(/[A-Za-z0-9_.$\/{\}?:=&%-]{4,180}/)
  candidates.select do |candidate|
    relevant_term = DISCOVERY_TERMS.any? { |term| candidate.downcase.include?(term) }
    relevant_shape = candidate.start_with?("/user_stats/", "/share_data/") ||
      candidate.start_with?("useUserData", "useUserHeatmap") ||
      %w[accuracy_over_time activity_daily activity_hourly new_content_heatmap review_heatmap].include?(candidate)
    relevant_term && relevant_shape
  end.uniq.sort
end

begin
  session = BunproSession.new(**bunpro_credentials).login!
  pages = WEB_PAGES.to_h do |path|
    response = get_web_following_redirects(session, path)
    [path, response]
  end
  assets = pages.values.flat_map { |response| dashboard_asset_sources(response.body) }.uniq
  discovered_paths = []
  discovered_hints = []
  asset_hints = {}

  assets.each do |asset|
    response = session.web_get(asset)
    next unless response.code.to_i == 200

    paths = frontend_paths(response.body)
    hints = api_hints(response.body)
    discovered_paths.concat(paths)
    discovered_hints.concat(hints)
    asset_hints[URI(asset).path] = (paths + hints).uniq.sort unless paths.empty? && hints.empty?
  end

  contracts = PROBE_PATHS.to_h do |path|
    [path, response_contract(session.api_get(path))]
  end

  puts JSON.pretty_generate(
    authentication: "ok",
    page_statuses: pages.transform_values { |response| response.code.to_i },
    page_assets_scanned: assets.length,
    frontend_paths_found_in_assets: discovered_paths.uniq.sort,
    frontend_api_hints_found_in_assets: discovered_hints.uniq.sort,
    frontend_api_hints_by_asset: asset_hints,
    probed_endpoints: contracts
  )
rescue StandardError => error
  warn "Bunpro frontend API discovery failed: #{error.class}"
  warn Array(error.backtrace).first(8)
  exit 1
end
