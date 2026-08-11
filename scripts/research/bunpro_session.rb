require "cgi"
require "net/http"
require "uri"

class BunproCookieJar
  def initialize
    @cookies = {}
  end

  def absorb(response)
    Array(response.get_fields("set-cookie")).each do |header|
      pair = header.split(";", 2).first
      name, value = pair.split("=", 2)
      @cookies[name] = value if name && value
    end
  end

  def header
    @cookies.map { |name, value| "#{name}=#{value}" }.join("; ")
  end

  def fetch(name)
    @cookies[name]
  end
end

class BunproSession
  WEB_ORIGIN = "https://bunpro.jp"
  API_ORIGIN = "https://api.bunpro.jp"

  attr_reader :frontend_token

  def initialize(email:, password:)
    @email = email
    @password = password
    @cookies = BunproCookieJar.new
    @frontend_token = nil
  end

  def login!
    login_page = request(:get, "#{WEB_ORIGIN}/login")
    raise "Bunpro login page was unavailable" unless login_page.code.to_i == 200

    csrf_token = extract_csrf_token(login_page.body)
    sign_in = request(
      :post,
      "#{WEB_ORIGIN}/users/sign_in",
      form: {
        "authenticity_token" => csrf_token,
        "user[email]" => @email,
        "user[password]" => @password,
        "user[remember_me]" => "0"
      }
    )

    @frontend_token = @cookies.fetch("frontend_api_token")
    unless sign_in.is_a?(Net::HTTPRedirection) && present?(@frontend_token)
      raise "Bunpro login did not establish an authenticated session"
    end

    self
  end

  def api_get(path)
    ensure_authenticated!
    request(
      :get,
      URI.join(API_ORIGIN, path).to_s,
      use_cookies: false,
      headers: {
        "Accept" => "application/json",
        "Authorization" => "Token token=#{@frontend_token}",
        "Origin" => WEB_ORIGIN,
        "Referer" => "#{WEB_ORIGIN}/"
      }
    )
  end

  def web_get(path_or_url)
    url = path_or_url.start_with?("http://", "https://") ? path_or_url : URI.join(WEB_ORIGIN, path_or_url).to_s
    uri = URI(url)
    raise "Refusing to send Bunpro cookies to another host" unless uri.host == URI(WEB_ORIGIN).host

    request(:get, url)
  end

  private

  def request(method, url, form: nil, headers: {}, use_cookies: true)
    uri = URI(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 20

    request = method == :post ? Net::HTTP::Post.new(uri.request_uri) : Net::HTTP::Get.new(uri.request_uri)
    request["Accept"] = "application/json, text/html;q=0.9"
    request["User-Agent"] = "bunpro-mcp-research/0.1"
    request["Cookie"] = @cookies.header if use_cookies && !@cookies.header.empty?
    headers.each { |name, value| request[name] = value }
    request.set_form_data(form) if form

    response = http.request(request)
    @cookies.absorb(response) if use_cookies
    response
  end

  def extract_csrf_token(html)
    match = html.match(/name="authenticity_token" value="([^"]+)"/)
    raise "Bunpro login page did not contain an authenticity token" unless match

    CGI.unescapeHTML(match[1])
  end

  def ensure_authenticated!
    raise "Bunpro session is not authenticated" unless present?(@frontend_token)
  end

  def present?(value)
    !value.nil? && !value.empty?
  end
end

def bunpro_credentials
  email = ENV["BUNPRO_EMAIL"] || ENV["BUNPRO_USERNAME"]
  password = ENV["BUNPRO_PASSWORD"]

  unless email && !email.empty? && password && !password.empty?
    raise "BUNPRO_EMAIL (or BUNPRO_USERNAME) and BUNPRO_PASSWORD are required"
  end

  { email: email, password: password }
end
