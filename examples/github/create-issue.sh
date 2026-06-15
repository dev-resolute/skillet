#!/bin/bash
# Usage: create-issue.sh owner repo title [body] [assignees] [milestone] [labels]
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: create-issue.sh owner repo title [body] [assignees] [milestone] [labels]" >&2
  exit 1
fi

owner="$1"
repo="$2"
title="$3"
body="${4:-}"
assignees="${5:-}"
milestone="${6:-}"
labels="${7:-}"

json="{\"title\":\"$title\""
if [ -n "$body" ]; then
  json+=" ,\"body\":\"$body\""
fi
if [ -n "$assignees" ]; then
  IFS=',' read -ra assignee_arr <<< "$assignees"
  json+=" ,\"assignees\":["
  for i in "${!assignee_arr[@]}"; do
    if [ "$i" -ne 0 ]; then json+=","; fi
    json+="\"${assignee_arr[$i]}\""
  done
  json+="]"
fi
if [ -n "$milestone" ]; then
  json+=" ,\"milestone\":\"$milestone\""
fi
if [ -n "$labels" ]; then
  IFS=',' read -ra label_arr <<< "$labels"
  json+=" ,\"labels\":["
  for i in "${!label_arr[@]}"; do
    if [ "$i" -ne 0 ]; then json+=","; fi
    json+="\"${label_arr[$i]}\""
  done
  json+="]"
fi
json+="}"

curl -sSL -X POST -H "Authorization: Bearer ${GITHUB_API_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$json" \
  "https://api.github.com/repos/${owner}/${repo}/issues"
