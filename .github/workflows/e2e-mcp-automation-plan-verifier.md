---
description: |
  Verifier agent for the E2E MCP planner. Reviews the test plan PR content
  to ensure quality: correct selectors, sufficient coverage, proper
  structure. Approves by adding a label or dispatches the planner fixer.
  On approval, dispatches the MCP runner (not the spec writer).

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Feature area being planned"
        required: true
      pr_number:
        description: "PR number to verify (auto-detected if empty)"
        required: false
      attempt:
        description: "Attempt number"
        required: false
        default: "1"

permissions: read-all

network: defaults

checkout:
  fetch: ["*"]
  fetch-depth: 0

imports:
  - shared/playwright-rancher-ai.md

safe-outputs:
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  add-labels:
    target: "*"
  dispatch-workflow: [e2e-mcp-automation-plan-fixer, e2e-mcp-automation-runner]
  create-issue:
    title-prefix: "[e2e-mcp-automation-plan-verifier] "
    labels: [bot/e2e-mcp-automation, bot/e2e-mcp-automation/qa-review]
    expires: 2d
    max: 1
  noop:

tools:
  playwright:
    args: ["--ignore-https-errors"]
  web-fetch:
  github:
    toolsets: [all]
  repo-memory:
    branch-name: memory/default
    max-file-size: 102400
    max-patch-size: 102400
    file-glob: ["*.patch", "*.md"]

timeout-minutes: 60
---

# E2E MCP Planner Verifier

You are a **QA verification agent** that reviews MCP test plan documents.
Your job is to ensure the test plan is high quality before it proceeds to
**MCP Playwright execution** (not spec writing).

**Feature area**: `${{ github.event.inputs.feature_area }}`

## Step 0 - Read Learnings

```bash
cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo "No planner learnings file found yet"
```

## Step 1 - Find the PR

If `${{ github.event.inputs.pr_number }}` is provided, use that.

Otherwise, auto-detect:
```bash
gh pr list --repo "$GITHUB_REPOSITORY" \
  --label bot/e2e-mcp-automation \
  --label bot/e2e-mcp-automation/plan \
  --state open \
  --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("test/e2e-mcp-${{ github.event.inputs.feature_area }}")) | .number' \
  | head -1
```

## Step 2 - Checkout the PR Branch

```bash
PR_DATA=$(gh pr view $PR_NUMBER --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
```

## Step 3 - Read the Test Plan

```bash
find cypress/e2e -name "mcp-test-plan-${{ github.event.inputs.feature_area }}*" -type f
```

Then read the content of the found file.

## Step 4 - Verify the Test Plan

Check the following quality criteria:

### Structure (required)
- Has a clear header with feature area name
- Explicitly states MCP Playwright as the execution method
- Has at least 5 test cases
- Each test case has: name, description, preconditions, steps, assertions, selectors, screenshot name
- Has Prerequisites section with app URL, credentials, mock service URL

### Selectors (required)
- All referenced `data-testid` selectors actually exist in the source components
- Verify by reading Vue component files

### Steps Quality (MCP-specific)
- Steps are written as natural language instructions an AI agent can follow
- Each step includes explicit selector references
- Wait conditions are specified
- Screenshot instructions are included
- Mock setup includes full HTTP request details

### Coverage (required)
- Tests cover main user interactions for this feature
- Tests cover error states and edge cases

### Feasibility (Playwright-specific)
- All interactions are achievable with Playwright
- No Cypress-specific API references
- Wait strategies are appropriate

For each selector, verify it exists:
```bash
grep -r "data-testid=\"<selector>\"" pkg/rancher-ai-ui/components/
```

## Step 5 - Comment on PR

Post a comment with pass/fail checklist and verdict: APPROVED or NEEDS_FIX.

## Step 6 - Decision

### ALL checks pass
1. Add label `bot/e2e-mcp-automation/plan-approved`
2. Dispatch `e2e-mcp-automation-runner` with:
   - `feature_area`: the feature area
   - `pr_number`: the PR number
   - `attempt`: `1`

### ANY check fails (attempt < 5)
Dispatch `e2e-mcp-automation-plan-fixer` with:
- `feature_area`, `pr_number`, `attempt`, `failure_summary`

### ANY check fails (attempt >= 5)
Create an issue reporting verification failure.

## Step 7 - Update Learnings

Update `/tmp/gh-aw/repo-memory/default/planner.md` with insights, then
call `push_repo_memory`.
