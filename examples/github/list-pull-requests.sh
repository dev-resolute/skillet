#!/bin/bash
# Usage: list-pull-requests.sh owner repo [key=value ...]
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: list-pull-requests.sh owner repo [key=value ...]" >&2
  exit 1
fi

owner="$1"
repo="$2"
shift 2

query_string=""
for arg in "$@"; do
  key="${arg%%=*}"
  val="${arg#*=}"
  # URL encode key and val
  key_enc=$(printf '%s' "$key" | jq -sRr @uri)
  val_enc=$(printf '%s' "$val" | jq -sRr @uri)
  if [[ -n "$query_string" ]]; then query_string+="&"; fi
  query_string+="${key_enc}=${val_enc}"
done

url="https://api.github.com/repos/${owner}/${repo}/pulls"
if [[ -n "$query_string" ]]; then url+="?$query_string"; fi

curl -sSL -H "Authorization: Bearer ${GITHUB_API_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "$url"
