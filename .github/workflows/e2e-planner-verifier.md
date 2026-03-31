---
description: |
  Verifier agent for the E2E planner. Reviews the test plan PR content
  to ensure quality: correct selectors, sufficient coverage, proper
  structure. Approves by adding a label or dispatches the planner fixer.

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
  - shared/cypress-rancher-ai.md

safe-outputs:
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  add-labels:
    target: "*"
  dispatch-workflow: [e2e-planner-fixer, e2e-generic-spec-writer]
  create-issue:
    title-prefix: "[e2e-planner-verifier] "
    labels: [ai-e2e, qa-review]
    expires: 2d
    max: 1
  noop:

tools:
  github:
    toolsets: [default]
  bash:
    - "cat *"
    - "ls *"
    - "find *"
    - "head *"
    - "tail *"
    - "grep *"
    - "wc *"
    - "jq *"
  repo-memory:
    branch-name: memory/default
    max-file-size: 102400
    max-patch-size: 102400
    file-glob: ["*.patch", "*.md"]

timeout-minutes: 60
---

# E2E Planner Verifier

You are a **QA verification agent** that reviews test plan documents created
by the E2E Planner. Your job is to ensure the test plan is high quality
before it proceeds to spec writing.

**Feature area**: `${{ github.event.inputs.feature_area }}`

## Step 0 - Read Learnings

Read the planner learnings from repo-memory:

```bash
cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo "No planner learnings file found yet"
```

This file contains accumulated learnings from previous plan verification
runs — common plan quality issues, selector verification failures, coverage
gaps, and other insights. Use this knowledge to improve your review.

If the file does not exist or is empty, skip this step.

## Step 1 - Find the PR

If `${{ github.event.inputs.pr_number }}` is provided, use that.

Otherwise, auto-detect the PR:
```bash
gh pr list --repo "$GITHUB_REPOSITORY" \
  --label ai-e2e \
  --label e2e-plan \
  --state open \
  --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("test/e2e-${{ github.event.inputs.feature_area }}")) | .number' \
  | head -1
```

If no PR is found, create an issue and stop.

## Step 2 - Checkout the PR Branch

Get the PR branch name and check it out:
```bash
PR_DATA=$(gh pr view $PR_NUMBER --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
```

## Step 3 - Read the Test Plan

Read the test plan file:
```bash
find cypress/e2e -name "test-plan-${{ github.event.inputs.feature_area }}*" -type f
```

Then read the content of the found file.

## Step 4 - Verify the Test Plan

Check the following quality criteria:

### Structure (required)
- [ ] Has a clear header with feature area name
- [ ] Has at least 5 test cases
- [ ] Each test case has: name, description, preconditions, steps, assertions, selectors, screenshot name

### Selectors (required)
- [ ] All referenced `data-testid` selectors actually exist in the source components
- [ ] Verify by reading the relevant Vue component files and checking for the exact selectors

### Coverage (required)
- [ ] Tests cover the main user interactions for this feature
- [ ] Tests cover error states and edge cases
- [ ] Tests include proper mock setup for LLM responses

### Patterns (required)
- [ ] Screenshot names follow the pattern: `<feature>-test-N-<description>`
- [ ] Spec file location is correct: `cypress/e2e/tests/features/<feature_area>.spec.ts`
- [ ] Page object references are correct (existing POs exist, new POs are well-defined)

### Feasibility (required)
- [ ] All described interactions are possible with Cypress
- [ ] No references to unsupported Cypress features (e.g., {tab} in cy.type)
- [ ] Wait strategies are appropriate for async operations

For each selector referenced in the test plan, verify it exists:
```bash
grep -r "data-testid=\"<selector>\"" pkg/rancher-ai-ui/components/
```

## Step 5 - Comment on PR

**Always** post a comment on the PR using `add-comment`:
- **pull_request_number**: the PR number
- **body**: Include:
  - Heading: `Plan Verification - Attempt N`
  - A checklist showing pass/fail for each quality criterion
  - For each failure: what is wrong and what needs to be fixed
  - Overall verdict: APPROVED or NEEDS_FIX

## Step 6 - Decision

### ALL checks pass
1. Add the label `plan-approved` to the PR using `add-label`
2. Dispatch `e2e-generic-spec-writer` with:
   - `feature_area`: the feature area
   - `pr_number`: the PR number
3. Comment that the plan is approved and spec writing will begin

### ANY check fails (attempt < 5)
Dispatch `e2e-planner-fixer` with:
- `feature_area`: the feature area
- `pr_number`: the PR number
- `attempt`: current attempt (string)
- `failure_summary`: JSON string listing each failed check with:
  - `check`: the check name
  - `reason`: why it failed
  - `suggestion`: how to fix it

### ANY check fails (attempt >= 5)
Use `create-issue` to report the plan could not be verified after 5 attempts.

## Step 7 - Update Learnings

Update the learnings file in repo-memory with insights from this verification run.

1. **Read** the current learnings file:
   ```bash
   cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo ""
   ```
   If the file does not exist, create it with a header:
   ```bash
   echo "# E2E Planner Learnings" > /tmp/gh-aw/repo-memory/default/planner.md
   ```

2. **Amend** the file — do NOT delete and rewrite the entire content.
   Add new insights under the appropriate sections:
   - **Selector Verification** — map verified selectors
   - **Common Plan Issues** — structure problems, missing sections
   - **Component Mapping** — which components map to feature areas
   - **Coverage Guidelines** — behaviors commonly missed
   - **Anti-Patterns** — things the planner should avoid

3. Remove outdated or redundant entries. Keep it well-organized with bullet
   points. The goal is a compact, high-value reference.

4. Write the updated content back to the file at
   `/tmp/gh-aw/repo-memory/default/planner.md`.

5. Call `push_repo_memory` to save the updated learnings file.
   It will be auto-committed to the `memory/default` branch.

## Rules

- Be strict about selector verification - wrong selectors cause spec failures
- Each test plan must have at least 5 test cases
- The test plan must be actionable - a spec writer should be able to create
  the spec directly from it without additional research
- Always verify selectors against actual source components
