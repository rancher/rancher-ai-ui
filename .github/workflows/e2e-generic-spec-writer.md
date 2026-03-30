---
description: |
  Generic agentic workflow that reads a test plan from the PR branch and
  creates a Cypress E2E spec. Saves a patch to repo-memory and dispatches
  the apply-spec-writer-patch workflow to push the spec to the existing PR.

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Feature area to create spec for (must match test plan name)"
        required: true
        type: string
      pr_number:
        description: "PR number containing the test plan (auto-detected if empty)"
        required: false
        type: string
      force_recreate:
        description: "Force recreation of the spec even if it already exists"
        required: false
        type: boolean
        default: false

permissions: read-all

network:
  allowed:
    - defaults
    - node

imports:
  - shared/cypress-rancher-ai.md

checkout:
  fetch: ["*"]
  fetch-depth: 0

safe-outputs:
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  dispatch-workflow: [apply-e2e-spec-writer-patch]
  create-issue:
    title-prefix: "[e2e-generic-spec-writer] "
    labels: [ai-e2e, automation]
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
    - "grep *"
    - "jq *"
    - "wc *"
    - "node *"
    - "npx *"
    - "npm *"
    - "git *"
  edit:
  repo-memory:
    branch-name: memory/default
    max-file-size: 65536
    max-patch-size: 102400
    file-glob: ["*.patch"]

timeout-minutes: 60
---

# E2E Generic Spec Writer

You are an **E2E spec-writing agent** for the Rancher AI UI extension. Your
job is to read the test plan from the PR branch and create a complete Cypress
spec for `${{ github.event.inputs.feature_area }}`, then save it as a patch
to be pushed to the existing PR.

## Step 1 - Find the PR

If `${{ github.event.inputs.pr_number }}` is provided, use that.

Otherwise, auto-detect:
```bash
gh pr list --repo "$GITHUB_REPOSITORY" \
  --label ai-e2e \
  --label plan-approved \
  --state open \
  --json number,headRefName \
  --jq '.[] | select(.headRefName | startswith("test/e2e-${{ github.event.inputs.feature_area }}")) | .number' \
  | head -1
```

## Step 2 - Checkout the PR Branch

```bash
PR_DATA=$(gh pr view $PR_NUMBER --json headRefName)
BRANCH=$(echo "$PR_DATA" | jq -r '.headRefName')
git checkout "$BRANCH"
```

## Step 3 - Read the Test Plan

Read the test plan document from the PR branch:

```bash
PLAN_FILE=$(find cypress/e2e -name "test-plan-${{ github.event.inputs.feature_area }}*" -type f)
cat "$PLAN_FILE"
```

If the test plan does not exist, create an issue and stop.

## Step 4 - Check for Existing Spec

```bash
find cypress/e2e/tests/features -name "*${{ github.event.inputs.feature_area }}*" -type f
```

If a spec already exists and `force_recreate` is not true:
- Use `noop` explaining the spec already exists
- Stop

## Step 5 - Study Existing Patterns

Read working specs to understand established patterns:

```bash
cat cypress/e2e/tests/features/chat.spec.ts
```

Also check existing page objects:
```bash
ls cypress/e2e/po/
```

Key patterns to follow:
- Import page objects and use them for all interactions
- Use `cy.enqueueLLMResponse()` before sending messages
- Use `cy.get('[data-testid="..."]')` for all selectors
- Screenshots on the chat container: `cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('name')`
- Add `cy.wait(500)` before screenshots
- Use `.should('be.visible')` for element existence checks

## Step 6 - Read Relevant Source Components

Based on the test plan, read the source components to verify:
- Correct `data-testid` attributes
- Actual component behavior and state management

## Step 7 - Create the Spec File

Create the spec at: `cypress/e2e/tests/features/${{ github.event.inputs.feature_area }}.spec.ts`

The spec MUST follow the test plan exactly:
- Same number of test cases
- Same test names
- Same assertions
- Same screenshot names

Structure:
```typescript
describe('Feature: ${{ github.event.inputs.feature_area }}', () => {
  beforeEach(() => {
    // Common setup from test plan
  });

  it('Test 1: <name from plan>', () => {
    // Steps from test plan
  });

  // ... more tests
});
```

## Step 8 - Create any needed Page Objects

If the test plan specifies new page objects, create them in:
`cypress/e2e/po/<name>.po.ts`

## Step 9 - Comment on PR

Post a comment on the PR using add-comment:
- **pull_request_number**: the PR number
- **body**: Include:
  - Summary of spec created
  - Number of test cases
  - Files created
  - Note that the spec will be pushed and then the runner triggered

## Step 10 - Commit and Save Patch

Commit all new files and generate a patch:

```bash
git add cypress/e2e/tests/features/${{ github.event.inputs.feature_area }}.spec.ts
# Also add any new PO files
git add cypress/e2e/po/ 2>/dev/null || true
git commit -m "test(e2e): add ${{ github.event.inputs.feature_area }} spec"
git diff HEAD~1 > /tmp/gh-aw/repo-memory/default/e2e-spec-pr-$PR_NUMBER.patch
```

Verify the patch starts with `diff --git`:
```bash
head -3 /tmp/gh-aw/repo-memory/default/e2e-spec-pr-$PR_NUMBER.patch
```

**IMPORTANT**: Place the patch directly at:
`/tmp/gh-aw/repo-memory/default/e2e-spec-pr-<PR_NUMBER>.patch`

Do NOT create subdirectories. After saving, call push_repo_memory.

## Step 11 - Dispatch apply-spec-writer-patch

Dispatch `apply-e2e-spec-writer-patch` to push the spec to the PR and trigger the runner.

Use the dispatch-workflow safe output:
- workflow: apply-e2e-spec-writer-patch

## Rules

- Follow the test plan EXACTLY
- Use only selectors that actually exist in the source components
- Every test MUST have a screenshot at the end
- Use `cy.wait(500)` before every screenshot
- Screenshots on the container element, not viewport
- Mock all LLM interactions with `cy.enqueueLLMResponse()`
- Do not use `cy.type('{tab}')` - unsupported
- Keyboard shortcuts must use combined syntax: `{alt+k}`, `{ctrl+shift+o}`
- Stub clipboard before copy tests
- Do NOT create a new PR - save patch to repo-memory instead
- Do NOT use git push - the apply-patch workflow handles that
