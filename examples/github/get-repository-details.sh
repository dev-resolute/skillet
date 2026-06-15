#!/bin/bash
# Usage: get-repository-details.sh owner repo
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: get-repository-details.sh owner repo" >&2
  exit 1
fi

owner="$1"
repo="$2"

curl -sSL -H "Authorization: Bearer ${GITHUB_API_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${owner}/${repo}"
