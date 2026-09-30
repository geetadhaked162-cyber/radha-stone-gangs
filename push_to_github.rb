#!/usr/bin/env ruby
# Radha Stone Gangsa - Push to GitHub via GitHub REST API
# Usage: ruby push_to_github.rb <GITHUB_PERSONAL_ACCESS_TOKEN>

require 'net/http'
require 'uri'
require 'json'
require 'base64'

REPO_OWNER = 'geetadhaked162-cyber'
REPO_NAME  = 'radha-stone-gangs'
BRANCH     = 'main'

token = ARGV[0] || ENV['GITHUB_TOKEN']

if token.nil? || token.strip.empty?
  puts "=========================================================="
  puts "❌ Error: GitHub Personal Access Token is required."
  puts "Usage:"
  puts "  ruby push_to_github.rb <YOUR_GITHUB_TOKEN>"
  puts "=========================================================="
  exit 1
end

token = token.strip

def github_api_request(method, path, token, body = nil)
  uri = URI.parse("https://api.github.com#{path}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.read_timeout = 60
  http.open_timeout = 30

  req_class = case method.upcase
              when 'GET' then Net::HTTP::Get
              when 'POST' then Net::HTTP::Post
              when 'PATCH' then Net::HTTP::Patch
              else raise "Unsupported method #{method}"
              end

  req = req_class.new(uri.request_uri)
  req['Authorization'] = "token #{token}"
  req['Accept'] = 'application/vnd.github.v3+json'
  req['User-Agent'] = 'RadhaStone-Deployer'
  req['Content-Type'] = 'application/json' if body

  req.body = body.to_json if body

  res = http.request(req)
  unless res.is_a?(Net::HTTPSuccess) || res.code == '201' || res.code == '200'
    puts "❌ API Error on #{method} #{path} (#{res.code}): #{res.body}"
    exit 1
  end

  JSON.parse(res.body) rescue {}
end

puts "🚀 Starting deployment to https://github.com/#{REPO_OWNER}/#{REPO_NAME}..."

# 1. Verify access to repository
puts "📡 Verifying repository access..."
repo_info = github_api_request('GET', "/repos/#{REPO_OWNER}/#{REPO_NAME}", token)
puts "✓ Repository verified: #{repo_info['full_name']} (Default branch: #{repo_info['default_branch'] || 'main'})"

# 2. Gather files to commit
files_to_commit = []

# Root files
%w[index.html style.css script.js vercel.json package.json .gitignore README.md].each do |file|
  files_to_commit << file if File.exist?(file)
end

# Image files
Dir.glob('images/*').each do |img|
  files_to_commit << img if File.file?(img)
end

# Frame files
Dir.glob('frames/*').sort.each do |frame|
  files_to_commit << frame if File.file?(frame)
end

puts "📦 Found #{files_to_commit.length} files to push..."

# 3. Create Blobs
tree_items = []
total = files_to_commit.length

files_to_commit.each_with_index do |filepath, idx|
  print "\rUploading blobs: #{idx + 1}/#{total} (#{((idx + 1).to_f / total * 100).round}%) - #{filepath[0..30]}...         "
  $stdout.flush

  content_bytes = File.binread(filepath)
  b64_content = Base64.strict_encode64(content_bytes)

  blob_res = github_api_request('POST', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/blobs", token, {
    content: b64_content,
    encoding: 'base64'
  })

  tree_items << {
    path: filepath,
    mode: '100644',
    type: 'blob',
    sha: blob_res['sha']
  }
end
puts "\n✓ All blobs uploaded successfully!"

# 4. Create Tree
puts "🌳 Creating Git Tree..."
tree_res = github_api_request('POST', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/trees", token, {
  tree: tree_items
})
tree_sha = tree_res['sha']
puts "✓ Tree created with SHA: #{tree_sha}"

# 5. Check if parent commit exists
parent_sha = nil
begin
  ref_res = github_api_request('GET', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/ref/heads/#{BRANCH}", token)
  parent_sha = ref_res.dig('object', 'sha')
rescue => e
  # Empty repo or new branch, no parent
  parent_sha = nil
end

# 6. Create Commit
puts "💾 Creating Commit..."
commit_payload = {
  message: "Initial commit: Radha Stone Gangsa luxury website ready for Vercel deployment",
  tree: tree_sha
}
commit_payload[:parents] = [parent_sha] if parent_sha

commit_res = github_api_request('POST', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/commits", token, commit_payload)
new_commit_sha = commit_res['sha']
puts "✓ Commit created: #{new_commit_sha}"

# 7. Update or Create Branch Reference
puts "📌 Updating branch '#{BRANCH}'..."
if parent_sha
  github_api_request('PATCH', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/refs/heads/#{BRANCH}", token, {
    sha: new_commit_sha,
    force: true
  })
else
  github_api_request('POST', "/repos/#{REPO_OWNER}/#{REPO_NAME}/git/refs", token, {
    ref: "refs/heads/#{BRANCH}",
    sha: new_commit_sha
  })
end

puts "\n🎉 SUCCESS! All files have been pushed to:"
puts "👉 https://github.com/#{REPO_OWNER}/#{REPO_NAME}"
puts "👉 Branch: #{BRANCH}"
puts "\n🚀 Ready for Vercel deployment:"
puts "👉 https://vercel.com/new/clone?repository-url=https://github.com/#{REPO_OWNER}/#{REPO_NAME}"
