#!/bin/bash
# Get conversation history (messages/everything in a channel)

set -euo pipefail

API_URL="https://slack.com/api/conversations.history"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 CHANNEL_ID [--latest TS] [--oldest TS] [--inclusive true|false] [--limit N] [--cursor CURSOR]" >&2
  exit 1
fi
CHANNEL="$1"; shift

LATEST=""; OLDEST=""; INCLUSIVE=""; LIMIT=""; CURSOR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest)
      LATEST="$2"; shift 2 ;;
    --oldest)
      OLDEST="$2"; shift 2 ;;
    --inclusive)
      INCLUSIVE="$2"; shift 2 ;;
    --limit)
      LIMIT="$2"; shift 2 ;;
    --cursor)
      CURSOR="$2"; shift 2 ;;
    *)
      echo "Usage: $0 CHANNEL_ID [--latest TS] [--oldest TS] [--inclusive true|false] [--limit N] [--cursor CURSOR]" >&2
      exit 1 ;;
  esac
done

PARAMS=("channel=$CHANNEL")
[[ -n "$LATEST" ]] && PARAMS+=("latest=$LATEST")
[[ -n "$OLDEST" ]] && PARAMS+=("oldest=$OLDEST")
[[ -n "$INCLUSIVE" ]] && PARAMS+=("inclusive=$INCLUSIVE")
[[ -n "$LIMIT" ]] && PARAMS+=("limit=$LIMIT")
[[ -n "$CURSOR" ]] && PARAMS+=("cursor=$CURSOR")

if [ ${#PARAMS[@]} -gt 0 ]; then
  QUERY_STRING="?$(IFS='&'; echo "${PARAMS[*]}")"
else
  QUERY_STRING=""
fi

curl -sSL -H "Authorization: Bearer ${SLACK_API_TOKEN}" "${API_URL}${QUERY_STRING}"
