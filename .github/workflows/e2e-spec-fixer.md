---
description: |
  Agentic workflow that reads E2E test failure artifacts and the verifier's
  analysis, fixes the Cypress spec, and re-triggers the runner workflow.
  Uses push-to-pull-request-branch to push fixes to the existing PR.

on:
  workflow_dispatch:
    inputs:
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
  push-to-pull-request-branch:
    target: "*"
    title-prefix: "test(e2e): "
    allowed-files:
      - "cypress/**"
    max: 1
  dispatch-workflow: [e2e-shortcuts-runner]
  create-issue:
    title-prefix: "[e2e-spec-fixer] "
    labels: [ai-e2e, automation]
    expires: 2d
    max: 1
  add-comment:
    target: "*"
    max: 1
    hide-older-comments: true
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
    - "mkdir *"
    - "git *"
  edit:
  repo-memory:
    branch-name: memory/default
    max-file-size: 65536
    file-glob: ["memory/default/patches/*.patch"]

timeout-minutes: 15
---

# E2E Spec Fixer

You are a **spec-fixing agent** for the Rancher AI UI extension. The E2E
test spec has failures and you need to fix them, then push the fix to the
existing PR and re-trigger the runner.

## Context

- **PR Number:** `${{ github.event.inputs.pr_number }}`
- **Attempt:** `${{ github.event.inputs.attempt }}`
- **Failure Summary:** `${{ github.event.inputs.failure_summary }}`

## Step 1 — Loop Guard

Calculate the next attempt number: `current_attempt + 1`.

If the next attempt would be **> 5**, do NOT re-trigger. Instead:
1. Create an issue explaining the spec could not be auto-fixed after 5 attempts
2. Include the full failure summary
3. Use `create-issue` and stop

## Step 2 — Checkout the PR Branch

Use the GitHub tool to look up PR #`${{ github.event.inputs.pr_number }}` and
get the head branch name. Then check it out:

```bash
git checkout <head-branch-from-PR>
```

## Step 3 — Analyze Failures

Parse the `failure_summary` input (JSON) to understand which checks failed and why.

Common failure categories:
1. **Selector not found** — The `data-testid` or CSS selector doesn't match the actual DOM
2. **Timing issue** — Element not ready when assertion runs (needs `cy.wait` or `should('be.visible')`)
3. **Wrong key combo** — The keyboard shortcut key sequence is incorrect
4. **Missing mock** — Need to call `cy.enqueueLLMResponse()` before sending a message
5. **Screenshot name mismatch** — Screenshot taken with wrong name
6. **Logic error** — Test flow doesn't match the actual UI behavior

## Step 4 — Study the Codebase for Fixes

Read the relevant source files to understand the correct behavior:

- `cypress/e2e/tests/features/shortcuts.spec.ts` — the current (failing) spec
- `pkg/rancher-ai-ui/composables/useInputComposable.ts` — keyboard shortcut bindings
- `pkg/rancher-ai-ui/pages/Chat.vue` — main chat page
- `cypress/e2e/po/chat.po.ts` — ChatPo page object
- `cypress/e2e/po/history.po.ts` — HistoryPo page object
- `cypress/e2e/po/console.po.ts` — ConsolePo page object
- Other page objects and components as needed

Also read working specs for patterns:
- `cypress/e2e/tests/features/chat.spec.ts`

## Step 5 — Fix the Spec

Edit `cypress/e2e/tests/features/shortcuts.spec.ts` to fix the identified issues.

Rules for fixes:
- Only change what's needed to fix failures — don't rewrite working tests
- Add appropriate waits (`cy.get(...).should('be.visible')`) for timing issues
- Use correct `data-testid` selectors from the actual components
- Ensure all `cy.screenshot()` calls use the exact expected names
- Keep the same test structure (7 tests, same screenshot names)

## Step 6 — Comment on PR

**Always** post a comment on the PR explaining this fix attempt using `add-comment`:
- **pull_request_number**: `${{ github.event.inputs.pr_number }}`
- **body**: Include:
  - Heading: `🔧 **E2E Spec Fixer — Attempt {next_attempt}**`
  - Summary of what failures were identified
  - What changes were made to the spec
  - Next steps (pushing fix and re-triggering runner)

Older comments from previous fixer runs will be automatically hidden.

## Step 7 — Commit and Push to PR

Commit the fix locally:

```bash
git add cypress/e2e/tests/features/shortcuts.spec.ts
git commit -m "fix(e2e): fix shortcuts spec — attempt $NEXT_ATTEMPT"
```

Then try to use the `push_to_pull_request_branch` tool to push to the existing PR:
- **pull_request_number**: `${{ github.event.inputs.pr_number }}`

**If the push fails** (e.g. because this repository is a fork and the safe output
cannot push), do the following fallback instead:

a. Generate a patch of your changes using bash:
   ```bash
   mkdir -p /tmp/gh-aw/repo-memory/default/memory/default/patches
   git diff HEAD~1 > /tmp/gh-aw/repo-memory/default/memory/default/patches/e2e-pr-${{ github.event.inputs.pr_number }}.patch
   ```
   This saves the patch to repo-memory. It will be auto-committed to the
   `memory/default` branch when the workflow finishes, and a separate trigger
   workflow will pick it up, apply it to the PR branch, and re-trigger the runner.

b. Post a comment on the PR using `add-comment` with:
   - **pull_request_number**: `${{ github.event.inputs.pr_number }}`
   - **body**: A summary with heading `🔧 **E2E Spec Fix — Patch Saved (attempt $NEXT_ATTEMPT)**`,
     what was fixed, and a note that a separate workflow will apply the patch and
     re-trigger the runner automatically.

c. Use `noop` to finish — do NOT dispatch the runner yourself. The apply-patch
   workflow will handle re-triggering.

## Step 8 — Re-trigger the Runner (direct push only)

**Only if Step 6 pushed directly** (no fallback), use the `e2e_shortcuts_runner`
tool to dispatch the runner workflow with inputs:
- `pr_number`: `${{ github.event.inputs.pr_number }}`
- `attempt`: the next attempt number (as a string)

Use the `e2e_shortcuts_runner` tool to dispatch the runner workflow with inputs:
- `pr_number`: `${{ github.event.inputs.pr_number }}`
- `attempt`: the next attempt number (as a string)

## Important Rules

- ALWAYS check the loop guard FIRST. If attempt >= 5, create an issue and stop.
- Parse the failure summary carefully — it contains specific check names and reasons.
- Be surgical with fixes — only change what's broken.
- Do NOT `git push` directly — use the `push_to_pull_request_branch` tool first.
- If `push_to_pull_request_branch` fails, use the repo-memory patch fallback.
- If you used the patch fallback, do NOT dispatch the runner — the apply-patch workflow handles it.
- If you pushed directly, ALWAYS dispatch the runner workflow after pushing.
- The runner will upload new artifacts, the verifier will re-check, closing the loop.
