---
description: |
  Fixer agent for the E2E MCP planner. Reads the verifier's failure summary,
  fixes the MCP test plan document, and saves a patch to repo-memory.
  Dispatches the apply-mcp-planner-patch workflow.

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Feature area being planned"
        required: true
        type: string
      pr_number:
        description: "PR number containing the test plan"
        required: true
        type: string
      attempt:
        description: "Current attempt number"
        required: true
        type: string
        default: "1"
      failure_summary:
        description: "JSON string with failed checks from the verifier"
        required: true
        type: string

permissions: read-all

network: defaults

checkout:
  fetch: ["*"]
  fetch-depth: 0

imports:
  - shared/playwright-rancher-ai.md

safe-outputs:
  create-issue:
    title-prefix: "[e2e-mcp-automation-plan-fixer] "
    labels: [bot/e2e-mcp-automation, bot/e2e-mcp-automation/automation]
    expires: 2d
    max: 1
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  dispatch-workflow: [apply-e2e-mcp-automation-plan-patch]
  noop:

tools:
  github:
    toolsets: [default]
  bash:
    - "cat *"
    - "ls *"
    - "find *"
    - "head *"
    - "grep *"
    - "jq *"
    - "cp *"
    - "git *"
    - "wc *"
  edit:
  repo-memory:
    branch-name: memory/default
    max-file-size: 102400
    max-patch-size: 102400
    file-glob: ["*.patch", "*.md"]

timeout-minutes: 60
---

# E2E MCP Planner Fixer

You are a **test plan fixing agent** for the Rancher AI UI extension. The
MCP test plan for `${{ github.event.inputs.feature_area }}` has quality issues
found by the verifier. Fix them.

## Context

- **Feature Area:** `${{ github.event.inputs.feature_area }}`
- **PR Number:** `${{ github.event.inputs.pr_number }}`
- **Attempt:** `${{ github.event.inputs.attempt }}`
- **Failure Summary:** `${{ github.event.inputs.failure_summary }}`

## Step 0 - Read Learnings

```bash
cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo "No planner learnings file found yet"
```

## Step 1 - Loop Guard

Calculate the next attempt number: current_attempt + 1.

If the next attempt would be > 5, create an issue and stop.

## Step 2 - Checkout the PR Branch

```bash
PR_DATA=$(gh pr view ${{ github.event.inputs.pr_number }} --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
```

## Step 3 - Analyze Failures

Parse the failure_summary JSON. Common issues:
1. Missing selectors
2. Insufficient test cases (< 5)
3. Missing structure fields
4. Wrong screenshot names
5. Vague steps not specific enough for Playwright
6. Missing mock data setup
7. Cypress-specific references
8. Missing wait conditions

## Step 4 - Read Source Components

```bash
grep -r "data-testid" pkg/rancher-ai-ui/components/<feature>/ | head -30
```

## Step 5 - Fix the Test Plan

Find and fix:
```bash
PLAN_FILE=$(find cypress/e2e -name "mcp-test-plan-${{ github.event.inputs.feature_area }}*" -type f)
```

## Step 6 - Comment on PR

Post a comment with the fixes summary.

## Step 7 - Commit and Save Patch

```bash
git add "$PLAN_FILE"
git commit -m "fix(e2e-mcp): fix MCP test plan for ${{ github.event.inputs.feature_area }} - attempt $NEXT_ATTEMPT"
git diff HEAD~1 -- "$PLAN_FILE" > /tmp/gh-aw/repo-memory/default/e2e-mcp-plan-pr-${{ github.event.inputs.pr_number }}.patch
```

Place patch at `/tmp/gh-aw/repo-memory/default/e2e-mcp-plan-pr-<PR_NUMBER>.patch`.
Then call push_repo_memory.

## Step 8 - Dispatch apply-mcp-planner-patch

Dispatch `apply-e2e-mcp-automation-plan-patch`.

## Rules

- ALWAYS check the loop guard FIRST
- Be surgical - only fix what the verifier flagged
- Verify selectors against actual source components
- Do NOT use git push - save patch to repo-memory
- Ensure all fixes maintain MCP Playwright compatibility (no Cypress references)
