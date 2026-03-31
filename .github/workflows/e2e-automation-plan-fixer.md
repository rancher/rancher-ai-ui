---
description: |
  Fixer agent for the E2E planner. Reads the verifier's failure summary,
  fixes the test plan document, and saves a patch to repo-memory.
  Dispatches the apply-planner-patch workflow.

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
  - shared/cypress-rancher-ai.md

safe-outputs:
  create-issue:
    title-prefix: "[e2e-automation-plan-fixer] "
    labels: [bot/e2e-automation, bot/e2e-automation/automation]
    expires: 2d
    max: 1
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  dispatch-workflow: [apply-e2e-automation-plan-patch]
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

# E2E Planner Fixer

You are a **test plan fixing agent** for the Rancher AI UI extension. The
test plan for `${{ github.event.inputs.feature_area }}` has quality issues
found by the verifier. Fix them.

**CRITICAL: Be efficient. Focus on the failure summary, fix the test plan,
and save the patch.**

## Context

- **Feature Area:** `${{ github.event.inputs.feature_area }}`
- **PR Number:** `${{ github.event.inputs.pr_number }}`
- **Attempt:** `${{ github.event.inputs.attempt }}`
- **Failure Summary:** `${{ github.event.inputs.failure_summary }}`

## Step 0 - Read Learnings

Read the planner learnings from repo-memory:

```bash
cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo "No planner learnings file found yet"
```

Read the output. This file contains accumulated learnings from the planner verifier —
common plan issues, correct selectors, coverage gaps, and component mapping.
**Use this knowledge** to make better fixes and avoid repeating known
mistakes.

If the file does not exist, skip this step.

## Step 1 - Loop Guard

Calculate the next attempt number: current_attempt + 1.

If the next attempt would be > 5, do NOT re-trigger. Instead:
1. Create an issue explaining the test plan could not pass verification
2. Include the full failure summary
3. Use create-issue and stop

## Step 2 - Checkout the PR Branch

Look up PR #`${{ github.event.inputs.pr_number }}` and check out its branch:

```bash
PR_DATA=$(gh pr view ${{ github.event.inputs.pr_number }} --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
```

## Step 3 - Analyze Failures

Parse the failure_summary input (JSON). Common issues:

1. **Missing selectors** - Referenced data-testid does not exist in components
2. **Insufficient test cases** - Fewer than 5 test cases
3. **Missing structure** - Test case missing required fields
4. **Wrong screenshot names** - Not following the naming pattern
5. **Infeasible interactions** - Using unsupported Cypress features
6. **Missing mock data** - No LLM response mocks defined

## Step 4 - Read Source Components

For selector verification failures, read the actual Vue components to find
the correct `data-testid` attributes:

```bash
grep -r "data-testid" pkg/rancher-ai-ui/components/<feature>/ | head -30
```

## Step 5 - Fix the Test Plan

Find and edit the test plan:
```bash
PLAN_FILE=$(find cypress/e2e -name "test-plan-${{ github.event.inputs.feature_area }}*" -type f)
```

Edit the file to fix all identified issues. Ensure:
- All selectors reference actual `data-testid` values from the components
- At least 5 test cases are present
- Each test case has all required fields
- Screenshot names follow the pattern
- Interactions are feasible with Cypress

## Step 6 - Comment on PR

Post a comment on the PR using add-comment:
- **pull_request_number**: `${{ github.event.inputs.pr_number }}`
- **body**: Include heading with feature area and attempt number, summary of
  fixes made, and next steps.

## Step 7 - Commit and Save Patch

```bash
git add "$PLAN_FILE"
git commit -m "fix(e2e): fix test plan for ${{ github.event.inputs.feature_area }} - attempt $NEXT_ATTEMPT"
git diff HEAD~1 -- "$PLAN_FILE" > /tmp/gh-aw/repo-memory/default/e2e-plan-pr-${{ github.event.inputs.pr_number }}.patch
```

Verify the patch starts with `diff --git`:
```bash
head -3 /tmp/gh-aw/repo-memory/default/e2e-plan-pr-${{ github.event.inputs.pr_number }}.patch
```

**IMPORTANT**: Place the patch directly at:
`/tmp/gh-aw/repo-memory/default/e2e-plan-pr-<PR_NUMBER>.patch`

Do NOT create subdirectories. After saving, call push_repo_memory.

## Step 8 - Dispatch apply-planner-patch

Dispatch `apply-e2e-automation-plan-patch` to push the fix and re-trigger the verifier.

Use the dispatch-workflow safe output:
- workflow: apply-e2e-automation-plan-patch

## Important Rules

- ALWAYS check the loop guard FIRST
- Be surgical - only fix what the verifier flagged
- Verify selectors against actual source components
- Do NOT use git push - save patch to repo-memory
- Do NOT dispatch the verifier directly - the apply-patch handles it
