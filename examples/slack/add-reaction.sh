#!/bin/bash
# Add a reaction to a message

set -euo pipefail

API_URL="https://slack.com/api/reactions.add"

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 CHANNEL NAME TIMESTAMP" >&2
  exit 1
fi
CHANNEL="$1"; NAME="$2"; TIMESTAMP="$3"

curl -sSL -X POST -H "Authorization: Bearer ${SLACK_API_TOKEN}" \
  --data-urlencode "channel=$CHANNEL" \
  --data-urlencode "name=$NAME" \
  --data-urlencode "timestamp=$TIMESTAMP" \
  "${API_URL}"
