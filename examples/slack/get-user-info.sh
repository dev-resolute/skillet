#!/bin/bash
# Get user info

set -euo pipefail

API_URL="https://slack.com/api/users.info"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 USER_ID [--include-locale true|false]" >&2
  exit 1
fi
USER_ID="$1"; shift
INCLUDE_LOCALE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-locale)
      INCLUDE_LOCALE="$2"; shift 2 ;;
    *)
      echo "Usage: $0 USER_ID [--include-locale true|false]" >&2; exit 1 ;;
  esac
done

PARAMS=("user=$USER_ID")
[[ -n "$INCLUDE_LOCALE" ]] && PARAMS+=("include_locale=$INCLUDE_LOCALE")

if [ ${#PARAMS[@]} -gt 0 ]; then
  QUERY_STRING="?$(IFS='&'; echo "${PARAMS[*]}")"
else
  QUERY_STRING=""
fi

curl -sSL -H "Authorization: Bearer ${SLACK_API_TOKEN}" "${API_URL}${QUERY_STRING}"
