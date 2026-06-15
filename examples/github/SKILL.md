---
name: github
description: Official GitHub API operations for repositories, issues, and pull requests. Use for interacting with GitHub repositories, issues, pull requests, and searching repositories.
---

# GitHub

Interact directly with GitHub repositories, issues, pull requests, and search using the GitHub REST API v3.

## Setup

1. Create a GitHub account at https://github.com/join
2. Generate a personal access token by following https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
3. Add to your shell profile (`~/.profile` or `~/.zprofile`):

```bash
export GITHUB_API_TOKEN="your-github-token"
```

## Get repository details

```bash
{baseDir}/get-repository-details.sh owner repo
```

- `owner`: GitHub username or org
- `repo`: Repository name (no .git)

## List issues

```bash
{baseDir}/list-issues.sh owner repo [options]
```

Options (all optional, in key=value format):
  milestone=... state=... assignee=... type=... creator=... mentioned=... issue_field_values=... labels=... sort=... direction=... since=... per_page=... page=...

## List pull requests

```bash
{baseDir}/list-pull-requests.sh owner repo [options]
```

Options (all optional, in key=value format):
  state=... head=... base=... sort=... direction=... per_page=... page=...

## Search repositories

```bash
{baseDir}/search-repositories.sh "search query" [options]
```

- Search query required (see https://docs.github.com/rest/search/search#constructing-a-search-query)
Options (all optional, in key=value format):
  sort=... order=... per_page=... page=...

## Create issue

Generated from spec, not live-verified (mutating operation).

```bash
{baseDir}/create-issue.sh owner repo title [body] [assignees] [milestone] [labels]
```

- `title`: Issue title (required)
- `body`: Issue body/description
- `assignees`: Comma-separated list (usernames)
- `milestone`: Milestone number or string
- `labels`: Comma-separated labels

## Add issue comment

Generated from spec, not live-verified (mutating operation).

```bash
{baseDir}/add-issue-comment.sh owner repo issue_number "comment body"
```

- `owner`, `repo`: As above
- `issue_number`: Numeric issue number
- `comment body`: The comment text

## Output Format

All scripts print JSON as returned by the GitHub API. For lists (issues, PRs, search), output will be an array or an object with array fields. For single-entity (details, create), output is the object for that entity.