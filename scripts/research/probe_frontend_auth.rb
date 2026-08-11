#!/usr/bin/env ruby

require "json"
require_relative "bunpro_session"

class BunproAuthProbe
  def initialize(session)
    @session = session
  end

  def run
    @session.login!
    account_page = @session.web_get("/settings/account")
    frontend_user_status = @session.api_get("/api/frontend/user").code.to_i

    result = {
      login: "ok",
      account_page_status: account_page.code.to_i,
      account_page_redirected_to_login: account_page.is_a?(Net::HTTPRedirection) && account_page["location"].to_s.include?("sign_in"),
      frontend_token_present: !@session.frontend_token.nil? && !@session.frontend_token.empty?,
      frontend_user_status: frontend_user_status
    }

    puts JSON.pretty_generate(result)
    frontend_user_status == 200
  end
end

begin
  session = BunproSession.new(**bunpro_credentials)
  exit(BunproAuthProbe.new(session).run ? 0 : 1)
rescue StandardError => error
  warn "Bunpro frontend authentication probe failed: #{error.class}"
  exit 1
end
