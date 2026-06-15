#!/bin/bash
# List conversations (channels, groups, DMs)

set -euo pipefail

API_URL="https://slack.com/api/conversations.list"

# Defaults
EXCLUDE_ARCHIVED=""
TYPES=""
LIMIT=""
CURSOR=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --exclude-archived)
      EXCLUDE_ARCHIVED="$2"; shift 2 ;;
    --types)
      TYPES="$2"; shift 2 ;;
    --limit)
      LIMIT="$2"; shift 2 ;;
    --cursor)
      CURSOR="$2"; shift 2 ;;
    *)
      echo "Usage: $0 [--exclude-archived true|false] [--types types] [--limit N] [--cursor CURSOR]" >&2; exit 1 ;;
  esac
done

PARAMS=()
[[ -n "$EXCLUDE_ARCHIVED" ]] && PARAMS+=("exclude_archived=$EXCLUDE_ARCHIVED")
[[ -n "$TYPES" ]] && PARAMS+=("types=$TYPES")
[[ -n "$LIMIT" ]] && PARAMS+=("limit=$LIMIT")
[[ -n "$CURSOR" ]] && PARAMS+=("cursor=$CURSOR")

if [ ${#PARAMS[@]} -gt 0 ]; then
  QUERY_STRING="?$(IFS='&'; echo "${PARAMS[*]}")"
else
  QUERY_STRING=""
fi

curl -sSL -H "Authorization: Bearer ${SLACK_API_TOKEN}" "${API_URL}${QUERY_STRING}"
