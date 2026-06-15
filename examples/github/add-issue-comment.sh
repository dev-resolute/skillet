#!/bin/bash
# Usage: add-issue-comment.sh owner repo issue_number "comment body"
set -euo pipefail

if [ $# -ne 4 ]; then
  echo "Usage: add-issue-comment.sh owner repo issue_number \"comment body\"" >&2
  exit 1
fi

owner="$1"
repo="$2"
issue_number="$3"
body="$4"

json="{\"body\":\"$body\"}"

curl -sSL -X POST -H "Authorization: Bearer ${GITHUB_API_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$json" \
  "https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments"
