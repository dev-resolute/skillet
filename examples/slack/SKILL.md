---
name: slack
description: Access Slack workspace info, messages, users, and post or react to messages via Slack Web API. Use for retrieving Slack channels, history, users, or automating workspace messaging and reactions.
---

# Slack

Interact with Slack: list channels/users, inspect conversations, send messages, and add reactions.

## Setup

1. Create a Slack app and generate an OAuth access token: https://api.slack.com/authentication/basics (see "OAuth Tokens & Redirect URLs").
2. Add to your shell profile (`~/.profile` or `~/.zprofile`):

```bash
export SLACK_API_TOKEN="your-slack-oauth-token"
```

## list conversations

```bash
{baseDir}/list-conversations.sh [--exclude-archived true|false] [--types public_channel,private_channel,mpim,im] [--limit N] [--cursor CURSOR]
```

List all Slack conversations (channels, groups, DMs).

- `--exclude-archived`: Optional, true/false
- `--types`: Comma-separated list from `public_channel,private_channel,mpim,im`
- `--limit`: Optional, max 1000
- `--cursor`: For pagination

## get conversation history

```bash
{baseDir}/get-conversation-history.sh "CHANNEL_ID" [--latest TS] [--oldest TS] [--inclusive true|false] [--limit N] [--cursor CURSOR]
```

Fetch messages/events for a conversation.

- `CHANNEL_ID`: Required Slack channel ID
- `--latest`, `--oldest`: Limit time range by message ts
- `--inclusive`: Include boundary timestamps
- `--limit`: Max results
- `--cursor`: For pagination

## list users

```bash
{baseDir}/list-users.sh [--limit N] [--cursor CURSOR] [--include-locale true|false]
```

List all users in the workspace.

- `--limit`: Optional
- `--cursor`: For pagination
- `--include-locale`: true/false

## get user info

```bash
{baseDir}/get-user-info.sh "USER_ID" [--include-locale true|false]
```

Get information for a specific user.

- `USER_ID`: Required Slack user ID
- `--include-locale`: Optional, true/false

## post message

Generated from spec, not live-verified (mutating operation).

```bash
{baseDir}/post-message.sh "CHANNEL" "TEXT" [options]
```

Send a message to a channel or DM. Required: `CHANNEL` and `TEXT`.

- Options (as `--option value`):
  - `--as-user true|false`, `--attachments JSON`, `--blocks JSON`, `--icon-emoji ":emoji:"`, `--icon-url URL`, `--link-names true|false`, `--mrkdwn true|false`, `--parse FORMAT`, `--reply-broadcast true|false`, `--thread-ts TS`, `--unfurl-links true|false`, `--unfurl-media true|false`, `--username NAME`

## add reaction

Generated from spec, not live-verified (mutating operation).

```bash
{baseDir}/add-reaction.sh "CHANNEL" "NAME" "TIMESTAMP"
```

Add a reaction (emoji) to a message in a channel.

- `CHANNEL`: Channel ID
- `NAME`: Emoji name (without colons)
- `TIMESTAMP`: Message timestamp

## Output Format

All scripts return the Slack API JSON response as-is. Common fields:
- On success: `ok: true`, result object(s), e.g., `channels`, `members`, `messages`.
- On error: `ok: false`, `error` field with cause.
