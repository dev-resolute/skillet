#!/bin/bash
# Send a message to a Slack channel

set -euo pipefail

API_URL="https://slack.com/api/chat.postMessage"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 CHANNEL TEXT [--as-user true|false] [--attachments JSON] [--blocks JSON] [--icon-emoji ':emoji:'] [--icon-url URL] [--link-names true|false] [--mrkdwn true|false] [--parse STR] [--reply-broadcast true|false] [--thread-ts TS] [--unfurl-links true|false] [--unfurl-media true|false] [--username NAME]" >&2
  exit 1
fi
CHANNEL="$1"; shift
TEXT="$1"; shift

# Optionals
declare -A ARGS
KEYS=(as-user attachments blocks icon-emoji icon-url link-names mrkdwn parse reply-broadcast thread-ts unfurl-links unfurl-media username)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --as-user) ARGS[as_user]="$2"; shift 2 ;;
    --attachments) ARGS[attachments]="$2"; shift 2 ;;
    --blocks) ARGS[blocks]="$2"; shift 2 ;;
    --icon-emoji) ARGS[icon_emoji]="$2"; shift 2 ;;
    --icon-url) ARGS[icon_url]="$2"; shift 2 ;;
    --link-names) ARGS[link_names]="$2"; shift 2 ;;
    --mrkdwn) ARGS[mrkdwn]="$2"; shift 2 ;;
    --parse) ARGS[parse]="$2"; shift 2 ;;
    --reply-broadcast) ARGS[reply_broadcast]="$2"; shift 2 ;;
    --thread-ts) ARGS[thread_ts]="$2"; shift 2 ;;
    --unfurl-links) ARGS[unfurl_links]="$2"; shift 2 ;;
    --unfurl-media) ARGS[unfurl_media]="$2"; shift 2 ;;
    --username) ARGS[username]="$2"; shift 2 ;;
    *)
      echo "Usage: $0 CHANNEL TEXT [--as-user true|false] ..." >&2; exit 1 ;;
  esac
done

DATA=(--data-urlencode "channel=$CHANNEL" --data-urlencode "text=$TEXT")
for k in "${!ARGS[@]}"; do
  DATA+=(--data-urlencode "$k=${ARGS[$k]}")
done

curl -sSL -X POST -H "Authorization: Bearer ${SLACK_API_TOKEN}" \
  "${API_URL}" \
  "${DATA[@]}"
