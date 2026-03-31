---
description: |
  Generic agentic workflow that reads E2E test failure artifacts and the
  verifier analysis, fixes the Cypress spec for any feature area, and
  saves a patch to repo-memory. Dispatches the generic apply-patch workflow.

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Feature area being tested"
        required: true
        type: string
      pr_number:
        description: "PR number to push fixes to"
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
  create-issue:
    title-prefix: "[e2e-generic-fixer] "
    labels: [ai-e2e, automation]
    expires: 2d
    max: 1
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
  dispatch-workflow: [apply-e2e-generic-patch]
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
    max-file-size: 65536
    max-patch-size: 102400
    file-glob: ["*.patch", "*.md"]

timeout-minutes: 60
---

# E2E Generic Spec Fixer

You are a **spec-fixing agent** for the Rancher AI UI extension. The E2E
test spec for `${{ github.event.inputs.feature_area }}` has failures and you
need to fix them, then save a patch.

**CRITICAL: You have a limited time budget. Do NOT spend more than 5 minutes
reading files. Focus on the failure summary, read only the files directly
relevant to the failures, make the fix, and save the patch.**

## Context

- **Feature Area:** `${{ github.event.inputs.feature_area }}`
- **PR Number:** `${{ github.event.inputs.pr_number }}`
- **Attempt:** `${{ github.event.inputs.attempt }}`
- **Failure Summary:** `${{ github.event.inputs.failure_summary }}`

## Step 0 - Read Learnings

Read `.github/e2e-learnings/generic.md` from the checked-out repo if it
exists. This file contains accumulated learnings from the verifier — common
failure patterns, correct selectors, Cypress best practices, and
feature-specific notes. **Use this knowledge** to make better fixes and
avoid repeating known mistakes.

If the file does not exist, skip this step.

## Step 1 - Loop Guard

Calculate the next attempt number: current_attempt + 1.

If the next attempt would be > 5, do NOT re-trigger. Instead:
1. Create an issue explaining the spec could not be auto-fixed after 5 attempts
2. Include the full failure summary and feature area
3. Use create-issue and stop

## Step 2 - Read the Test Plan

Read the test plan from repo-memory to understand what the spec should test:

```bash
cat /tmp/gh-aw/repo-memory/default/test-plan-${{ github.event.inputs.feature_area }}.md
```

This gives you the complete specification of what the tests should cover.

## Step 3 - Checkout the PR Branch

Use the GitHub tool to look up PR #`${{ github.event.inputs.pr_number }}` and
get the head branch name. Then check it out:

```bash
git checkout <head-branch-from-PR>
```

## Step 4 - Analyze Failures

Parse the failure_summary input (JSON) to understand which tests failed and why.

Common failure categories:
1. **Selector not found** - data-testid or CSS selector does not match the actual DOM
2. **Timing issue** - Element not ready when assertion runs (needs cy.wait or should be.visible)
3. **Wrong interaction** - Using incorrect Cypress commands or unsupported key combos
4. **Missing mock** - Need to call cy.enqueueLLMResponse() before sending a message
5. **Screenshot issue** - Screenshots must be taken on the chat container element:
   `cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('name')`
   and always add `cy.wait(500)` before each screenshot call.
6. **Clipboard permission denied** - In headless CI, navigator.clipboard.writeText()
   fails. Must stub it: `cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').resolves())`
7. **tab not supported** - `cy.type('{tab}')` is NOT valid Cypress. Never use it.
8. **Logic error** - Test flow does not match actual UI behavior

## Step 5 - Read Only What You Need

**Be targeted.** Read at most 2-3 files based on the failure summary:

1. **Always read first:** The spec file for this feature area. Search for it:
   ```bash
   find cypress/e2e/tests/features -name "*${{ github.event.inputs.feature_area }}*"
   ```
2. **If selector issues:** Read the specific page object or component in the error
3. **If pattern issues:** Read `cypress/e2e/tests/features/chat.spec.ts` for patterns

Do NOT read every file in the project. The imported cypress-rancher-ai.md
context already contains the page objects, selectors, and custom commands.

## Step 6 - Fix the Spec

Edit the spec file to fix the identified issues.

Rules for fixes:
- Only change what is needed to fix failures - do not rewrite working tests
- Add appropriate waits (cy.get(...).should('be.visible')) for timing issues
- Use correct data-testid selectors from the actual components
- Screenshots MUST be taken on the chat container element, not the viewport
- Add cy.wait(500) before every cy.screenshot() to ensure DOM stability
- Keyboard shortcuts MUST use combined modifier syntax: {alt+k}, {ctrl+shift+o}
- Stub clipboard before copy tests
- Never use {tab} in cy.type() - it is not supported
- Keep the same test structure (same number of tests, same screenshot names)

## Step 7 - Comment on PR

**Always** post a comment on the PR explaining this fix attempt using add-comment:
- **pull_request_number**: `${{ github.event.inputs.pr_number }}`
- **body**: Include heading with feature area and attempt number, summary of
  failures identified, changes made, and next steps.

Older comments from previous fixer runs will be automatically hidden.

## Step 8 - Commit and Save Patch

Find the spec file path:
```bash
SPEC_FILE=$(find cypress/e2e/tests/features -name "*${{ github.event.inputs.feature_area }}*" -type f)
```

Commit the fix locally and generate a patch:

```bash
git add "$SPEC_FILE"
git commit -m "fix(e2e): fix ${{ github.event.inputs.feature_area }} spec - attempt $NEXT_ATTEMPT"
git diff HEAD~1 -- "$SPEC_FILE" > /tmp/gh-aw/repo-memory/default/e2e-pr-${{ github.event.inputs.pr_number }}.patch
```

Verify the patch starts with `diff --git` (not `---` with timestamps):
```bash
head -3 /tmp/gh-aw/repo-memory/default/e2e-pr-${{ github.event.inputs.pr_number }}.patch
```

If the first line does NOT start with `diff --git`, delete it and regenerate.

**IMPORTANT**: The patch file MUST be placed directly at:
`/tmp/gh-aw/repo-memory/default/e2e-pr-<PR_NUMBER>.patch`

Do NOT create any subdirectories - the sandbox blocks mkdir inside repo-memory.
Put the .patch file directly in `/tmp/gh-aw/repo-memory/default/`.

After saving, call the push_repo_memory tool to validate the size is within limits.

## Step 9 - Dispatch the apply-patch workflow

After saving the patch to repo-memory, dispatch the apply-e2e-generic-patch
workflow so it picks up the patch, pushes it to the PR branch, and
re-triggers the generic runner.

Use the dispatch-workflow safe output:
- workflow: apply-e2e-generic-patch
- feature_area: ${{ github.event.inputs.feature_area }}
- attempt: the **incremented** attempt number (current attempt + 1, as a string)

**CRITICAL**: You MUST pass the incremented attempt number. If the current
attempt is 2, pass "3". If it is 3, pass "4". This is how the pipeline
tracks retry count.

Do NOT try to git push or dispatch the runner yourself - the apply-patch
workflow handles that.

## Important Rules

- ALWAYS check the loop guard FIRST. If attempt >= 5, create an issue and stop.
- Parse the failure summary carefully - it contains specific test names and errors.
- Be surgical with fixes - only change what is broken.
- Do NOT use git push - save the patch to repo-memory instead.
- Do NOT dispatch the runner directly - dispatch apply-e2e-generic-patch.
- The apply-patch workflow will push the fix, dispatch the generic runner,
  and the verifier will re-check, closing the loop.
