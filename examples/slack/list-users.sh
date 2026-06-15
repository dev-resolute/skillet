#!/bin/bash
# List users in workspace

set -euo pipefail

API_URL="https://slack.com/api/users.list"

LIMIT=""
CURSOR=""
INCLUDE_LOCALE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)
      LIMIT="$2"; shift 2 ;;
    --cursor)
      CURSOR="$2"; shift 2 ;;
    --include-locale)
      INCLUDE_LOCALE="$2"; shift 2 ;;
    *)
      echo "Usage: $0 [--limit N] [--cursor CURSOR] [--include-locale true|false]" >&2; exit 1 ;;
  esac
done

PARAMS=()
[[ -n "$LIMIT" ]] && PARAMS+=("limit=$LIMIT")
[[ -n "$CURSOR" ]] && PARAMS+=("cursor=$CURSOR")
[[ -n "$INCLUDE_LOCALE" ]] && PARAMS+=("include_locale=$INCLUDE_LOCALE")

if [ ${#PARAMS[@]} -gt 0 ]; then
  QUERY_STRING="?$(IFS='&'; echo "${PARAMS[*]}")"
else
  QUERY_STRING=""
fi

curl -sSL -H "Authorization: Bearer ${SLACK_API_TOKEN}" "${API_URL}${QUERY_STRING}"
