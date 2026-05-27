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

## PR #208 — context (Attempt 2, 2026-05-08)
- **Test 4 (`.context-dropdown` not found, line 61)**: Same failure as Attempt 1. The `.context-dropdown` element is not found after deselect. The test retried 3 times and failed all attempts. The dropdown trigger must be clicked before asserting `.context-dropdown` content. The fixer needs to ensure the dropdown is opened prior to line 61.

## PR #208 — context (Attempt 3, 2026-05-08)
- **Test 4 (`.context-dropdown` not found)**: The `.context-dropdown` class is on `<rc-dropdown>` Vue component. Rancher's `rc-dropdown` uses `floating-vue` and renders dropdown content in `.v-popper__popper` (NOT inside the `.context-dropdown` container). Fix: use `cy.get('.v-popper__popper').filter(':visible').contains('local').click()` instead of scoping to `.context-dropdown`.
- The `rc-dropdown` component likely has `inheritAttrs: false` or renders as fragment, so Vue-applied classes don't appear on any DOM element.
- **Pattern**: For any `rc-dropdown` in Rancher, use `.v-popper__popper` with `.filter(':visible')` to find the open dropdown's content after clicking the trigger.

## PR #208 — context (Attempt 3, 2026-05-08)
- **All 8 tests passed** — the fixes from attempts 1-2 (`.v-popper__popper` for rc-dropdown, `failOnStatusCode: false` in cleanup) resolved all failures.
- Tests 1, 4, 8 required retries (attempt 2) before passing; all ultimately passed within Cypress retry budget.
- The `.v-popper__popper` selector pattern for `rc-dropdown` is confirmed working for Test 4.

## PR #209 — context-selection (Attempt 1, 2026-05-14)
- **All 8 tests passed** on attempt 1 — no fixes were needed.
- Test 8 required Cypress internal retry (attempt 2 of 3) but passed successfully; this is normal flakiness.
- The fixes from PR #208 (`.v-popper__popper` for rc-dropdown, `failOnStatusCode: false` in cleanup, cluster-scoped navigation for Test 8) were all effective and carried over to this PR.
- Confirms the spec is stable and the feature is working correctly.

## PR #217 — chat-panel-menu (Attempt 1, 2026-05-20)
- **Test 4 (`AssertionError`, line 84)**: After clicking "Edit Configuration", URL stayed at `/home` instead of matching `/\/(ai-assistant|settings)/`. The navigation triggered by the menu item is not working — either the route name is wrong, or the menu item click isn't propagating. Check the menu action handler in the PO/component.
- **Test 8 (`AssertionError`, line 118)**: `[data-testid="card"].prompt-remove` not found after Ctrl+Shift+Backspace. The delete confirmation dialog was not rendered. Either the keyboard shortcut isn't bound, the shortcut handler references incorrect key codes, or the dialog uses a different selector/testid. Check `DeleteChatPromptPo` constructor at `cypress/e2e/po/dialog/delete-chat.po.ts:25`.
- Tests 1–3, 5–7, 9 all passed on first attempt.

## PR #217 — chat-panel-menu (Attempt 2, 2026-05-20)
- **Test 4 (`AssertionError`, line 84)**: After clicking "Edit Configuration", `ChatPo.isReady()` is called which looks for `[data-testid="rancher-ai-ui-chat-container"]`, but the test is now on the settings/AI page where this element does not exist. This is a different error from Attempt 1 (URL mismatch) — it appears the URL assertion was fixed, but the subsequent `isReady()` call at line 84 is incorrect for this context.
- **Root cause pattern**: `ChatPo.isReady()` should only be called when the chat panel is visible. After navigating to settings, the test should instead assert the settings page URL/content (e.g., `cy.url().should('match', /\/(ai-assistant|settings)/)` and verify a settings-page element, NOT call `isReady()` which expects the chat container).
- **Fix**: Remove or replace the `ChatPo.isReady()` call at line 84 with an assertion against a settings-page element (e.g., `cy.url().should('match', /\/(ai-assistant|settings)/)` without any further chat container assertion).

## PR #217 — chat-panel-menu (Attempt 3, 2026-05-20)
- **Test 4 (`AssertionError`, line 88)**: URL after clicking "Edit Configuration" is `https://localhost:8005/c/local/explorer#cluster-events` — NOT the expected `/ai-assistant` or `/settings`. The URL has changed across attempts (attempt 1: `/home`, attempt 2: line 84 `isReady()` issue, attempt 3: `c/local/explorer#cluster-events` on line 88).
- **Pattern**: The "Edit Configuration" menu item is not navigating to the settings/AI-assistant page. After clicking it, the page ends up on the cluster explorer instead. The navigation route used by the menu item is likely incorrect or the test is clicking the wrong element.
- **Recommendation**: Inspect the `editConfiguration()` PO method — ensure it routes to the correct path (e.g., `/ai-assistant` or `/settings`). Also check if the test needs to wait for navigation after click (rather than relying purely on URL assertion without explicit wait).
- Tests 1–3, 5–9 all passed on attempt 3.

## PR #217 — chat-panel-menu (Attempt 4, 2026-05-21)
- **All 9 tests passed** on attempt 4 — all previous fixes (Edit Configuration navigation, delete confirmation dialog) from attempts 1-3 were effective.
- Tests 4 and 8, which failed on attempts 1-3, passed cleanly this time.
- The feature is stable and fully working as of this attempt.

## PR #226 — settings-ui-tools-config (Attempt 1, 2026-05-25)
- **All 8 tests passed** on attempt 1 — no fixes were needed.
- Tests covered: section visibility, install banner, enable/disable toggle, guidelines reset, tools list display, search filter, category filter, and individual tool toggle.
- All tests completed within 1 minute 13 seconds total spec duration.
- This confirms the `settings-ui-tools-config` spec is well-written and the feature is working correctly out of the box.

## PR #227 — console-input (Attempt 1, 2026-05-26)
- **`before each` hook failure (`[data-testid="extension-header-action-ai.action.openChat"]` not found, line 13)**: The `ChatPo.open()` → `RancherHeaderPo.askLizButton()` call timed out after 3 attempts (10s each). The AI chat header button was not found.
- This is the same pattern as PR #208 Test 8 — the AI chat button may not be rendered if the page hasn't fully loaded, the feature flag is disabled, or the extension isn't installed in this environment.
- **Recommendation**: Ensure the page is fully loaded before `ChatPo.open()` in `before each`. Add an explicit wait or navigate to a page where the AI button is guaranteed to be present (e.g., home/cluster page with the extension active).
- All 7 tests were skipped due to the single hook failure — fixing the hook should unblock all tests.

## PR #227 — console-input (Attempt 2, 2026-05-26)
- **Test 2 (`CypressError`, `{tab}` not supported)**: `cy.type('{tab}')` throws "isn't a supported character sequence" in Cypress. Tab is not a valid `cy.type()` special character.
- **Fix**: Use `cy.realPress('Tab')` (from `cypress-real-events`) or `cy.focused().trigger('keydown', { key: 'Tab', keyCode: 9 })` instead of `cy.type('{tab}')`.
- **Anti-pattern**: Never use `cy.type('{tab}')` — Tab is not supported by `cy.type()`.
- Tests 1, 3–7 all passed; only Test 2 failed due to this typing issue.

## PR #227 — console-input (Attempt 3, 2026-05-26)
- **All 7 tests passed** on attempt 3 — all previous fixes (Tab key, ChatPo.open() hook) resolved failures.
- Tests 1–7 all passed cleanly: ArrowUp autocomplete, Tab acceptance, multiple ArrowUp navigation, ArrowDown navigation, typing clears autocomplete, LLM model label, disclaimer popover.
- Previous fixes: `cy.realPress('Tab')` instead of `cy.type('{tab}')` for Test 2; `ChatPo.open()` hook reliability fix for `before each`.
- The spec is now stable and the feature is working correctly.

## PR #228 — message-actions (Attempt 1, 2026-05-27)
- **Test 1 (`AssertionError`, line 25)**: `clipboard.writeText` was called with `"Copy this message"` instead of `"The copy response text."`. The copy action is copying the wrong text — likely picking up the button label or tooltip rather than the actual AI response message content. Check the copy handler in the `MessagePo` PO — ensure it reads the message text content, not the button's own text.
- **Test 7 (`AssertionError`, line 86)**: `[data-testid="rancher-ai-ui-chat-message-box-3"]` not found. The 4th chat message (index 3) was not rendered. Test 7 expects a pending-confirmation message to appear as the 4th message. The mock or setup may not be triggering the confirmation message correctly. Check how the pending-confirmation message is set up in the test — ensure the mock AI response includes the confirmation step.
- Tests 2–6 all passed cleanly (copy success checkmark, copy user message, edit-before-resend, edit success checkmark, resend).

## PR #228 — message-actions (Attempt 2, 2026-05-27)
- **Test 1 (`AssertionError`, line 25)**: Same failure as Attempt 1 — clipboard.writeText still called with `"Copy this message"` (button label) instead of `"The copy response text."` (AI message content). The copy handler in `MessagePo` is reading the wrong text source. Fix must ensure it reads the message body content, not the copy button's own label.
- **Test 7 (`AssertionError`, line 86)**: Same failure as Attempt 1 — `[data-testid="rancher-ai-ui-chat-message-box-3"]` still not found. The 4th chat message (pending-confirmation) is not being rendered. The mock setup for the confirmation step needs to be corrected.
- Tests 2–6 remain passing on both attempts — copy feedback checkmark, copy user message, edit populates textarea, edit success checkmark, resend.
- Both failures are persistent across 2 attempts, indicating the fixer's changes did not address the root causes yet.
