---
description: |
  Agentic workflow that analyzes the Rancher AI UI codebase, identifies
  features lacking E2E test coverage, and creates a PR with a detailed
  test plan document. Dispatches the MCP planner verifier for review.
  This pipeline uses MCP Playwright for execution instead of Cypress specs.

on:
  workflow_dispatch:
    inputs:
      feature_area:
        description: "Optional: specific feature area to plan tests for (e.g. history, multi-agent, context). If empty, auto-detects."
        required: false
        type: string
      force:
        description: "Force re-planning even if a test plan already exists"
        required: false
        type: boolean
        default: false

permissions: read-all

network: defaults

checkout:
  fetch: ["*"]
  fetch-depth: 0

imports:
  - shared/playwright-rancher-ai.md

safe-outputs:
  create-pull-request:
    title-prefix: "test(e2e-mcp): "
    labels: [bot/e2e-mcp-automation, bot/e2e-mcp-automation/plan]
    draft: true
    base-branch: e2e-agentic
    allowed-files:
      - "cypress/**"
    max: 1
  dispatch-workflow: [e2e-mcp-automation-plan-verifier]
  create-issue:
    title-prefix: "[e2e-mcp-automation-plan] "
    labels: [bot/e2e-mcp-automation, bot/e2e-mcp-automation/planning]
    expires: 7d
    max: 1
  noop:

tools:
  web-fetch:
  github:
    toolsets: [all]
  edit:
  repo-memory:
    branch-name: memory/default
    max-file-size: 102400
    max-patch-size: 102400
    file-glob: ["*.md"]

timeout-minutes: 60
---

# E2E MCP Test Planner

You are an **E2E test planner agent** for the Rancher AI UI extension. Your
job is to analyze the codebase, identify features that lack E2E test coverage,
create a detailed test plan document, and create a PR with it.

**IMPORTANT**: This test plan is designed for execution via **MCP Playwright**,
not Cypress. The test plan will be read by an AI agent that uses the Playwright
browser automation tool to execute the tests directly. **No spec file will be
created.** Write the plan so that an AI agent with Playwright access can
execute each test case step-by-step.

## Step 0 - Read Learnings

Read the planner learnings from repo-memory:

```bash
cat /tmp/gh-aw/repo-memory/default/planner.md 2>/dev/null || echo "No planner learnings file found yet"
```

If the file does not exist, skip this step.

## Step 1 - Determine Feature Area

If `${{ github.event.inputs.feature_area }}` is provided, use that.

Otherwise, analyze the codebase to find features lacking tests:

1. List existing E2E specs and MCP test plans:
   ```bash
   find cypress/e2e/tests/features -name "*.spec.ts" -type f | sort
   find cypress/e2e -name "mcp-test-plan-*" -type f | sort
   ```

2. List feature-related Vue components and composables:
   ```bash
   ls pkg/rancher-ai-ui/components/
   ls pkg/rancher-ai-ui/composables/
   ls pkg/rancher-ai-ui/pages/
   ```

3. Compare: which component directories do NOT have corresponding test coverage?

4. Choose the highest-priority untested feature area.

Priority order:
1. Features with user-facing UI components but no test coverage at all
2. Features with existing test plans but incomplete coverage
   (e.g., only happy-path tested, missing edge cases, error flows, or
   recently-added sub-features)
3. Features with complex interactions (multiple composables)
4. Features with settings/configuration pages

## Step 2 - Check for Existing Coverage and Open PRs

Check for open PRs that already cover E2E MCP test planning:

```bash
gh pr list --repo "$GITHUB_REPOSITORY" \
  --label bot/e2e-mcp-automation \
  --state open \
  --json number,headRefName,title \
  --jq '.[] | "\(.number) \(.headRefName) \(.title)"'
```

Any branch matching `test/e2e-mcp-<FEATURE>-spec` means that feature area is
already in progress.

**If `${{ github.event.inputs.force }}` is `true`**, ignore any existing open
PRs or merged test plans and proceed with planning anyway.

Otherwise, if the chosen feature already has an open PR, skip it.
If ALL candidates have open PRs, use `noop`.

Also check for existing MCP test plans already merged:
```bash
find cypress/e2e -name "mcp-test-plan-*.md" -type f 2>/dev/null
find cypress/e2e/tests/features -name "*.spec.ts" -type f 2>/dev/null
```

**Incremental planning**: If a test plan already exists for this feature
area, **do NOT skip it automatically**. Instead:
1. Read the existing test plan(s) for this feature.
2. Read the source components to identify all testable behaviors.
3. Determine which behaviors are **already covered** by existing tests.
4. If there are **uncovered behaviors remaining**, proceed to create an
   incremental plan covering only the gaps.
5. Only skip (or `noop`) if the feature is **fully covered** — every
   significant user flow, edge case, and error path already has a test.

If `force` is `true`, always proceed regardless of existing coverage.

## Step 3 - Analyze the Feature

Read the relevant source files to understand the feature deeply:

1. **Components**: Read Vue components in `pkg/rancher-ai-ui/components/<feature>/`
2. **Composables**: Read related composables in `pkg/rancher-ai-ui/composables/`
3. **Store**: Read related store modules in `pkg/rancher-ai-ui/store/`
4. **Pages**: Read any related pages in `pkg/rancher-ai-ui/pages/`
5. **Existing page objects**: Check `cypress/e2e/po/` for selector references
6. **Existing tests**: Read similar specs in `cypress/e2e/tests/features/` for patterns

Focus on:
- What `data-testid` attributes are available in the components
- What user interactions are possible (click, type, select, keyboard shortcuts)
- What state changes happen (store mutations, API calls)
- What mock API responses are needed (LLM mock service)

## Step 4 - Create the Test Plan

Create the test plan document. Choose the file path based on whether
this is an initial or incremental plan:
- **Initial**: `cypress/e2e/tests/features/mcp-test-plan-<FEATURE_AREA>.md`
- **Incremental**: `cypress/e2e/tests/features/mcp-test-plan-<FEATURE_AREA>-<N>.md`
  where `<N>` is the next sequential number (2, 3, …)

The plan MUST include:

### Header
- Feature area name
- Date created
- Source components analyzed
- **Execution method: MCP Playwright** (explicitly stated)
- **Plan type**: Initial or Incremental
- **Existing coverage** (incremental only): list existing test plan(s)
  for this feature, with a brief summary of what they cover

### Prerequisites
- Application URL: `https://localhost:8005`
- Login credentials: `admin` / `password`
- Self-signed certificate handling required
- LLM mock service URL: `http://localhost:1080`

### Test Cases (5-10)
For each test case:
- **Test number and name** (e.g., "Test 1: Opens chat panel")
- **Description**: What this test verifies
- **Preconditions**: Any setup needed (mock responses, navigation, state)
- **Steps**: Detailed Playwright-style instructions as natural language:
  - "Navigate to https://localhost:8005"
  - "Click the element with selector [data-testid='...']"
  - "Type 'Hello' into the element [data-testid='...']"
  - "Press Alt+K to open the chat panel"
  - "Wait for element [data-testid='...'] to be visible"
- **Assertions**: Observable conditions to verify
- **Selectors**: Which `data-testid` or CSS selectors to use
- **Screenshot**: Name for the screenshot (pattern: `<feature>-mcp-test-N-<description>`)

### Mock Data Setup
For each test needing mock LLM responses, include the full HTTP request details.

## Step 5 - Create the Pull Request

Use the `create-pull-request` safe output:
- **title**: `plan ${{ github.event.inputs.feature_area }} MCP E2E test coverage`
- **branch**: `test/e2e-mcp-<FEATURE_AREA>-spec`
- **body**: Include:
  - Summary of the feature area analyzed
  - Number of test cases planned
  - Whether this is an initial or incremental plan
  - For incremental plans: what existing coverage exists and what gaps this fills
  - Note about MCP Playwright execution method

## Step 6 - Dispatch the MCP Planner Verifier

Dispatch `e2e-mcp-automation-plan-verifier` with:
- `feature_area`: the feature area name (lowercase, hyphenated)
- `attempt`: `1`

## Rules

- Use only `data-testid` selectors that actually exist in the components
- Write steps as natural language instructions an AI agent can follow with Playwright
- Be explicit about selectors, wait conditions, and assertions
- Include mock setup instructions for any test that sends messages to the AI
- Initial plans should have 5-10 test cases; incremental plans should have
  as many test cases as needed to fill the remaining coverage gaps (minimum 3)
- **Never duplicate** tests that already exist — always cross-reference
  existing plans before writing new test cases
- For incremental plans, continue test numbering from where the last plan left off
- The feature area name should be lowercase and hyphenated
