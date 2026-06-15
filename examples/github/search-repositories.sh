#!/bin/bash
# Usage: search-repositories.sh "search query" [key=value ...]
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: search-repositories.sh \"search query\" [key=value ...]" >&2
  exit 1
fi

q="$1"
shift 1

query_string="q=$(printf '%s' "$q" | jq -sRr @uri)"
for arg in "$@"; do
  key="${arg%%=*}"
  val="${arg#*=}"
  key_enc=$(printf '%s' "$key" | jq -sRr @uri)
  val_enc=$(printf '%s' "$val" | jq -sRr @uri)
  query_string+="&${key_enc}=${val_enc}"
done

url="https://api.github.com/search/repositories?${query_string}"

curl -sSL -H "Authorization: Bearer ${GITHUB_API_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "$url"
