# E2E Generic Learnings

## Selector Corrections
- `[data-testid="rancher-ai-ui-context-dropdown-item-"]` — Test 5 dropdown item selector; the testid appears to have an empty suffix (no item name appended), causing it never to be found. Verify the actual rendered testid includes a non-empty identifier after the last `-`.
- `.context-dropdown` — used in Test 5 to find context dropdown; if times out, the dropdown may not be open.
- `.context-trigger` — used in Test 7 inside `<div.chat-context.disabled-panel>`; element may not exist when panel is disabled.
- `.chat-context` — used in Test 8 to find the context panel after re-navigating; element not found, suggesting the panel doesn't render on all pages post-navigation.

## Common Failure Patterns
- **`[data-testid="rancher-ai-ui-context-dropdown-item-"]` not found (Test 5)**: The data-testid suffix is empty — the actual items may have their name appended (e.g., `rancher-ai-ui-context-dropdown-item-local`). Check the PO `dropdownItem()` method at `context.po.ts:49` — it may be constructing the selector with an empty string.
- **`.context-dropdown` content timeout (Test 5)**: The dropdown for "Add context" may not render within 10s. Check that the dropdown is opened before asserting content.
- **`.chat-context` not found after re-navigation (Test 8)**: After removing all tags and navigating away/back, `.chat-context` is not found. The component may only render on cluster-scoped pages. Add a navigation step to a cluster page before asserting.
- **`.context-trigger` not found in disabled panel (Test 7)**: When the chat is not ready, the context trigger element may not be rendered at all inside `.chat-context.disabled-panel`. The test expects to find `.context-trigger` inside the disabled panel, but the element may be conditionally rendered only when enabled. (Test 7 now passing — this was fixed.)
- **afterEach cleanup 503 (Test 7 hook)**: The DELETE cleanup call to `/proxy/v1/api/chats` fails with 503 when the AI agent service is unavailable. Add `failOnStatusCode: false` to the cleanup `cy.request()`.

## Cypress Best Practices
- Add `failOnStatusCode: false` to cleanup `cy.request()` calls in `afterEach` hooks to prevent infrastructure unavailability from cascading into test failures.
- Before asserting dropdown content, ensure the dropdown is actually open (click trigger first, wait for it).
- For disabled-state tests, check whether the element is conditionally rendered or just visually disabled — adjust selectors accordingly.
- For tests involving navigation, ensure the target page actually renders the component under test (e.g., navigate to a cluster page before asserting `.chat-context`).

## Feature-Specific Notes (context-selection)
- All 8 tests fully passing as of attempt 3 (PR #209).
- Tests 1–4, 6, 7 were stable from attempt 2.
- Test 5 (toggle context via dropdown) was fixed by attempt 3: the `dropdownItem()` PO method was corrected to include the item name in the testid suffix.
- Test 8 (hide Reset after re-navigation) was fixed by attempt 3: navigation now targets a cluster-scoped page before asserting `.chat-context`.
- The `afterEach` hook deletes chat history via API; `failOnStatusCode: false` was added for resilience.

## Anti-Patterns
- Do NOT use `[data-testid="rancher-ai-ui-context-dropdown-item-"]` with an empty suffix — the PO method likely needs the item name as an argument.
- Do NOT assert `.context-trigger` exists inside a disabled panel without checking if it's rendered conditionally.
- Do NOT use `cy.request()` for cleanup without `failOnStatusCode: false` when the backend may be unavailable in CI.
- Do NOT assert `.chat-context` after navigating to the home page — the component may only render on cluster-scoped pages.

## PR #208 — context (Attempt 1, 2026-05-08)
- **Test 4 (`.context-dropdown` not found, line 61)**: The context dropdown element is not found after the deselect step. The dropdown trigger needs to be clicked before the `.context-dropdown` container is asserted. Ensure the spec opens the dropdown before trying to find `.context-dropdown`.
- **Test 8 (`[data-testid="extension-header-action-ai.action.openChat"]` not found, line 120)**: The AI chat header button testid is not found. The test tries to open the chat panel via `ChatPo.open()` → `RancherHeaderPo.askLizButton()`. This may fail if the page has not fully loaded or if the feature flag is disabled in this environment. Confirm the button is rendered before clicking.
- **afterEach hook 503 (Test 8)**: Still using `cy.request()` without `failOnStatusCode: false` in `cypress/support/commands/chat-history.ts:8`. This is a known anti-pattern — fix by adding `failOnStatusCode: false`.
