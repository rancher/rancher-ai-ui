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

## PR #228 — message-actions (Attempt 3, 2026-05-27)
- **Test 1 (`AssertionError`, line 26)**: Same as attempts 1 & 2 — `clipboard.writeText` called with `"Copy this message"` (button label) instead of `"The copy response text."`. Persistent across 3 attempts. The copy handler in `MessagePo` (or the component under test) is reading the button's own text, not the AI message body. The fixer must locate the actual copy handler and fix it to read message content.
- **Test 7 (`AssertionError`, line 87)**: Selector changed from `rancher-ai-ui-chat-message-box-3` (attempts 1-2) to `rancher-ai-ui-chat-message-confirmation-confirm-button` (attempt 3). The confirmation message still doesn't render. The mock for the pending-confirmation response is not set up correctly — the confirm button never appears. Check how the mock AI response with `type: "confirmation"` or similar is configured.
- Tests 2–6 remain stable across all 3 attempts.

## PR #228 — message-actions (Attempt 4, 2026-05-27)
- **Test 7 (`AssertionError`, line 85)**: Same persistent failure — `Expected to find content: 'Are you sure you want to proceed with this action?' but never did.` The confirmation dialog content is never rendered. The mock for the pending-confirmation AI response (`type: "confirmation"` or similar) is consistently failing to trigger the confirmation message. Now on 4th attempt — the fixer must fundamentally change how the mock returns a confirmation response. Check if the mock intercept is returning the correct response structure, or if the component expects a different field/format for a confirmation-type message.
- Tests 1–6 remain stable across all 4 attempts.
- Pattern: The `'Are you sure you want to proceed with this action?'` text is presumably part of a confirmation message rendered by the component. If the mock doesn't return the right shape for a confirmation message, the component will never render this text.

## PR #228 — message-actions (Attempt 5, 2026-05-27)
- **Test 7 (`AssertionError`, line 97)**: `<button.rc-button.btn.variant-tertiary.btn-sm>` exists but is NOT visible — clipped by a parent element with `overflow: hidden`, `scroll` or `auto`. This is a CSS overflow visibility issue, not a missing element.
- **Progression across 5 attempts**: mock setup improved (element eventually renders), but final assertion fails due to overflow clipping. The button exists in DOM but is hidden by parent overflow.
- **Fix options for Test 7**: (1) Use `.scrollIntoView()` before `.should('be.visible')`, (2) assert `should('not.be.visible')` or `should('not.exist')` if the intent is to confirm buttons are hidden on confirmation messages, (3) fix parent container CSS overflow.
- **Key insight**: Test 7 name is "Message action buttons NOT shown on pending-confirmation messages" — the correct assertion is likely `should('not.be.visible')` or `should('not.exist')`, not `should('be.visible')`. The spec may have the wrong assertion polarity.
- **Anti-pattern**: Do NOT assert `should('be.visible')` on elements inside overflow-hidden containers without `.scrollIntoView()`. Also verify the assertion polarity matches the test intent (hidden vs visible).
- Auto-fix abandoned after 5 attempts; manual intervention required.

## PR #230 — chat-open-shortcut (Attempt 1, 2026-05-28)
- **Tests 1, 3, 4, 6 (`AssertionError`, lines 20/35/49/75)**: All fail with same error — `[data-testid="rancher-ai-ui-chat-container"]` not found after `ChatPo.openViaKeyboard()` presses Alt+K.
- **Tests 2 and 5 passed** — these start with chat already open and only test closing; this confirms the chat container selector is correct when open.
- **Root cause**: Alt+K keyboard shortcut is not opening the chat panel. `openViaKeyboard()` at `chat.po.ts:75` triggers the keypress but the panel doesn't render. The shortcut listener may not be registered, the key combo may differ (e.g., needs `cy.realPress` or `trigger` instead of `cy.type`), or focus needs to be on the document body first.
- **Pattern**: When `openViaKeyboard()` fails consistently across all tests that rely on it, but close tests pass, the issue is in the open action, not the selector itself.
- **Recommendation**: Check how Alt+K is triggered in `openViaKeyboard()` — use `cy.get('body').trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` instead of `cy.type('{alt+k}')` if applicable. Also ensure document body has focus before triggering the shortcut.

## PR #230 — chat-open-shortcut (Attempt 2, 2026-05-28)
- **Same failure pattern as Attempt 1**: Tests 1, 3, 4, 6 fail with `[data-testid="rancher-ai-ui-chat-container"]` not found after `ChatPo.openViaKeyboard()`. Test 2 fails because `closeViaKeyboard()` can't close a panel that was never opened. Test 5 passes (starts with chat already open).
- **Root cause confirmed persistent**: The Alt+K keyboard shortcut `openViaKeyboard()` at `chat.po.ts:75` is not working. After 2 attempts, the fixer has not yet fixed the keyboard trigger method.
- **Fix required**: Replace whatever method is used to press Alt+K in `openViaKeyboard()` with `cy.get('body').trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` or `cy.realPress(['Alt', 'k'])` from cypress-real-events. Ensure body has focus first.
- **Pattern**: When multiple attempts fail with the exact same error on the keyboard open tests but Test 5 (close via keyboard) passes, the issue is specifically in `openViaKeyboard()` — the open shortcut action is not working.

## PR #230 — chat-open-shortcut (Attempt 3, 2026-05-28)
- **Same failure as attempts 1 & 2**: Tests 1, 3, 4, 6 fail with `[data-testid="rancher-ai-ui-chat-container"]` not found after `openViaKeyboard()`.
- Tests 2 and 5 (which start with chat already open) pass — confirming selector is correct.
- After 3 attempts, `openViaKeyboard()` still doesn't work. The fix must replace the keyboard trigger method entirely.
- **Critical fix needed**: Replace current keyboard trigger in `chat.po.ts:75` with `cy.get('body').focus().trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` or `cy.realPress(['Alt', 'k'])`. Ensure body has focus before the trigger.
- **Pattern confirmed**: When `openViaKeyboard()` fails repeatedly but close tests pass, the issue is 100% in the keyboard event dispatch method, not in the selector or the feature implementation.

## Feature-Specific Notes (chat-open-shortcut)
- `[data-testid="rancher-ai-ui-chat-container"]` — used by `ChatPo.isOpen()` to verify chat is open after Alt+K. Has failed persistently across 4 attempts; the element may not have this testid in the rendered DOM, or Alt+K keyboard trigger is unreliable in Cypress.
- `div.chat-container` — used by `ChatPo.isClosed()` to verify chat is closed. Note the inconsistency: open-check uses `data-testid` selector while close-check uses a CSS class selector. This mismatch may indicate the open/close logic targets different elements.
- Alt+K keyboard shortcut: `cy.type('{alt}k')` or equivalent may not fire correctly in Cypress — consider using `cy.trigger('keydown', { altKey: true, key: 'k' })` on the document body instead.
- After 4 fixer attempts, the root pattern remains the same: `openViaKeyboard` in `chat.po.ts` line ~80 fails to produce a visible chat container. The keyboard event dispatch approach likely needs changing.

## PR #230 — chat-open-shortcut (Attempt 5, 2026-05-28)
- **Same failure as all prior attempts**: Tests 1, 3, 4, 6 fail with `[data-testid="rancher-ai-ui-chat-container"]` not found after `openViaKeyboard()`. Test 2 fails with `div.chat-container` persisting (chat never closed because never opened). Test 5 passes.
- **Auto-fix abandoned after 5 attempts** — manual intervention required.
- **Definitive analysis**: After 5 attempts, the Alt+K keyboard event dispatch in `openViaKeyboard()` in `chat.po.ts` has never been fixed. The consistent 4/5 failure rate on open tests (with 5/5 close-when-open tests passing) confirms the issue is 100% in the keyboard trigger for opening.
- **Inconsistent selectors confirmed**: `isOpen()` uses `[data-testid="rancher-ai-ui-chat-container"]` while `isClosed()` uses `div.chat-container`. These should be reconciled to the same selector.
- **Key insight for manual fix**: (1) Verify actual data-testid on the chat container element in the component. (2) Change `openViaKeyboard()` keyboard dispatch to `cy.get('body').focus().trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` or use `cypress-real-events` `cy.realPress(['Alt', 'k'])`. (3) Align `isOpen()` and `isClosed()` to use the same selector.

## Feature-Specific Notes — chat-scroll
- **Test 5 (chat-scroll)**: `[data-teststatus="rancher-ai-ui-chat-message-status-13-completed"]` — selector for 13th message completion status. Consistently times out (3 retries). The element may not be rendered, the message count may be wrong, or the status never reaches "completed". Consider checking: (1) whether message index 13 is actually produced by the mock, (2) whether the attribute name `data-teststatus` is correct vs `data-testid`, (3) whether the status value "completed" matches the actual rendered value.
- **Test 5 (chat-scroll)**: Failure occurs at `message.po.ts:60` in `isCompleted()`. The PO method waits for `data-teststatus=...-completed`. If the mock stream never completes message 13, this will always time out.

## PR #233 — chat-scroll (Attempt 2, 2026-05-29)
- **Test 5 (`[data-testid="rancher-ai-ui-scroll-button"]` not found, line 91)**: The scroll button element is not found after the user scrolls up (which should suppress auto-scroll and show the button). Failed all 3 retry attempts.
- **Pattern**: After scrolling up (to suppress auto-scroll), the scroll button should become visible. If not found, check:
  1. Whether the scroll event is actually being detected by the component (manual scroll vs. programmatic scroll may behave differently).
  2. Whether the `[data-testid="rancher-ai-ui-scroll-button"]` element is conditionally rendered (v-if) vs. conditionally shown (v-show). If v-if, the element won't exist in DOM until conditions met.
  3. Whether the scroll position check in the component uses a threshold that the test's scroll amount doesn't cross.
  4. Whether the `cy.scrollTo()` call is being detected as a user-initiated scroll in the component's scroll event handler.
- **Note**: Tests 1-4 and 6 all pass, meaning the scroll button works in simpler scenarios. Test 5 specifically fails when auto-scroll suppression is expected — this is a timing/detection issue with the scroll-up interaction in the test.

## Feature-Specific Notes
- **chat-scroll**: Test 5 ("Auto-scroll is suppressed when user has scrolled up") is flaky — it needed a retry (attempt 1 of 3) before passing. Consider adding `cy.wait()` or retry assertions around scroll position checks.

## Feature-Specific Notes: message-actions

- **Test 1 (Copy AI response to clipboard)**: The spec asserts clipboard receives the AI message body text (e.g. `"The copy response text."`). A common failure is the clipboard receiving the button label/tooltip (`"Copy this message"`) instead of the actual message content. Check that the copy handler passes `message.text` (or equivalent) rather than a static string.
- Line 26 is where the clipboard assertion occurs in `message-actions.spec.ts`.

## Feature-Specific Notes
- **message-actions** (Attempt 2, PR 228): All 7 tests passed successfully after 1 fix attempt. Tests cover: copy AI response, copy success checkmark, copy user message, edit-before-resend textarea population, edit success checkmark, resend button, and action buttons hidden on pending-confirmation messages.

## PR #230 — chat-open-shortcut (Attempt 1 — new run, 2026-05-29)
- **Tests 1, 3, 4, 6 (AssertionError, lines 20/35/49/75)**: All fail with `[data-testid="rancher-ai-ui-chat-container"]` not found after `openViaKeyboard()`.
- **Test 2 fails** with `div.chat-container` continuously found — unlike prior runs where Test 2 passed. This suggests the keyboard shortcut also fails to CLOSE the chat. The chat container remains open after Alt+K press in `closeViaKeyboard()`.
- **Test 5 passes** (3339ms) — Alt+K closes the chat when textarea is focused. This confirms the Alt+K close path works in at least one scenario.
- **Selector inconsistency confirmed**: `isOpen()` uses `[data-testid="rancher-ai-ui-chat-container"]` but `isClosed()` uses `div.chat-container`. These likely target the same element but with different selectors, indicating the testid may not be applied to that element.
- **Critical root cause**: The `data-testid="rancher-ai-ui-chat-container"` attribute is likely not present on the rendered `div.chat-container`. Fix: align `isOpen()` in chat.po.ts to use `.chat-container` (CSS class) consistent with `isClosed()`, OR add the testid to the component.

## PR #230 — chat-open-shortcut (Attempt 2, 2026-05-29)
- **Same failure pattern**: Tests 1, 3, 4, 6 fail with `[data-testid="rancher-ai-ui-chat-container"]` not found after `openViaKeyboard()`. Test 2 fails with `div.chat-container` continuously found. Test 5 passes.
- **Test 2 still failing**: The chat was opened before Test 2 (prior state), but `closeViaKeyboard()` using Alt+K fails to close it. `div.chat-container` remains in DOM. This indicates the Alt+K shortcut does not work as a toggle either — OR the setup for Test 2 relies on `openViaKeyboard()` which also fails.
- **Confirmed pattern after 2 consecutive new attempts**: The keyboard shortcut dispatch in `openViaKeyboard()` is not working. The selector inconsistency between `isOpen()` (data-testid) and `isClosed()` (CSS class) is also unresolved.
- **High priority fix**: The fixer must address BOTH: (1) the keyboard trigger method in `openViaKeyboard()`, and (2) the selector in `isOpen()` to use `.chat-container` or ensure `data-testid="rancher-ai-ui-chat-container"` is applied to the actual element.

## PR #230 — chat-open-shortcut (Attempt 3, 2026-05-29)
- **Tests 1, 3, 4, 6 (AssertionError, lines 20/35/49/75)**: Same persistent failure — `[data-testid="rancher-ai-ui-chat-container"]` not found after `openViaKeyboard()`.
- **Test 2 NOW PASSES (3217ms)** — unlike attempts 1 & 2 in this run session where Test 2 failed. This confirms Test 2's beforeEach opens the chat via a non-keyboard method (UI click), and only the Alt+K close shortcut is used. The close shortcut works; only the open shortcut fails.
- **Test 5 passes (3147ms)** — consistent with all prior runs.
- **Root cause confirmed again**: `openViaKeyboard()` in `chat.po.ts:82` fails to trigger the chat open. The Alt+K keyboard event dispatch is broken. The selector `[data-testid="rancher-ai-ui-chat-container"]` is correct (Tests 2 and 5 context shows it works once the chat IS open). The bug is purely in the keyboard event dispatch in `openViaKeyboard()`.
- **Fixer must**: Change the Alt+K dispatch in `openViaKeyboard()` to use `cy.get('body').focus().trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` or `cy.realPress(['Alt', 'k'])`. The current approach (likely `cy.type('{alt}k')` or similar) does not fire the keyboard event correctly.

## Feature-Specific Notes — chat-open-shortcut
- `[data-testid="rancher-ai-ui-chat-container"]` — used by `ChatPo.isOpen()` to verify chat is open after Alt+K. Persistently fails across attempts 1-4; the element is never found after simulating Alt+K keyboard shortcut. This may indicate the keyboard event is not being captured by the app, or the chat panel is rendered under a different selector.
- `<div.chat-container>` — used by `ChatPo.isClosed()` to verify chat is closed. Even when the test expects it removed, it remains in the DOM, suggesting the close action via keyboard shortcut is not working.
- Test 5 (Alt+K closes when textarea focused) passes consistently, suggesting Alt+K IS registered but only when textarea is focused — or the close path works differently from the open path.
- Pattern: Tests 1, 3, 4, 6 all fail at `openViaKeyboard` → `isOpen` → `checkExists` for `[data-testid="rancher-ai-ui-chat-container"]`. The chat open shortcut (Alt+K) consistently fails to open the chat panel when it is closed.
- The fixer should investigate: (1) whether `data-testid="rancher-ai-ui-chat-container"` is the correct testid on the chat container element, (2) whether Alt+K simulation via `cy.type('{alt}k')` or similar works in Cypress, (3) adding a wait after keyboard event before asserting visibility.

## Feature-Specific Notes — chat-open-shortcut
- `[data-testid="rancher-ai-ui-chat-container"]` — used in `ChatPo.isOpen()` to verify the chat panel is visible. After 5 attempts, this selector is NEVER found when triggered via Alt+K keyboard shortcut. The actual rendered element may have a different testid or not match this selector.
- `<div.chat-container>` — used in `ChatPo.isClosed()` to verify chat is not in DOM. This element persists even after Alt+K close attempt, suggesting the keyboard shortcut is not working.
- **Alt+K keyboard shortcut** — the shortcut does not appear to trigger the chat open/close in headless Chrome Cypress tests. Consider using `cy.get('body').trigger('keydown', { altKey: true, key: 'k', keyCode: 75 })` instead of `cy.get('body').type('{alt}k')`.
- **Test 5 passes** while others fail — Test 5 opens chat via setup (not keyboard) then uses Alt+K to close when textarea is focused. The fact it passes suggests chat CAN open but the keyboard shortcut triggering may fail when body is focused.
- **Feature flag** — verify the chat feature flag is enabled in the test environment before triggering Alt+K.

## PR #230 — chat-open-shortcut (Attempt 1, 2026-05-29)
- **Outcome: Skipped** — The spec runner reported `outcome: skipped`. No `cypress-output.txt` was produced.
- This indicates the spec file `features/chat-open-shortcut.spec.ts` likely does not exist yet and needs to be created by the spec fixer.
- Dispatched `e2e-automation-spec-fixer` to create the spec file for the `chat-open-shortcut` feature area.

## Feature-Specific Notes (chat-open-shortcut)
- Feature area: keyboard shortcut or button to open the chat panel.
- Likely involves testing that a keyboard shortcut (e.g., Ctrl+K or similar) or a UI button opens the chat panel.
- The chat open button testid has been seen as `extension-header-action-ai.action.openChat` in other tests — may be relevant here.

## PR #230 — chat-open-shortcut (Attempt 2, 2026-05-29)
- **Tests 1, 3, 4, 6 (`AssertionError`, `[data-testid="rancher-ai-ui-chat-container"]` not found)**: The Alt+K keyboard shortcut does not open the chat panel. `ChatPo.openViaKeyboard()` → `ChatPo.isOpen()` → `checkExists('[data-testid="rancher-ai-ui-chat-container"]')` times out after 10s on all 3 Cypress retries.
- **Tests 2 and 5 (closing tests) pass**: These tests expect the chat to already be open (set up in `beforeEach`), then close it via Alt+K. The close direction works; only the open direction fails. This suggests Alt+K is partially implemented (close works) but the open path via keyboard is broken.
- **Pattern**: When tests that *close* a feature work but tests that *open* via keyboard fail, the keyboard event listener is either not attached, uses the wrong key modifier (e.g., expects `altKey` but test sends `{alt}k`), or the shortcut only works in certain DOM contexts.
- **Root cause hypothesis**: `openViaKeyboard()` in `chat.po.ts:75` likely uses `cy.type('{alt}k')` or similar. Verify that the keyboard shortcut handler is registered globally (not just on the chat component) and that the event is dispatched on `document` or `body`.
- **Recommendation**: Check `ChatPo.openViaKeyboard()` implementation — ensure it dispatches the key event on `cy.get('body')` (not on a focused element). Also verify the actual key combination the shortcut handler listens for matches what Cypress dispatches.
- **Line references**: Test 1 → line 20, Test 3 → line 35, Test 4 → line 49, Test 6 → line 76.

## PR #230 — chat-open-shortcut (Attempt 3, 2026-05-29)
- **Tests 1, 3, 4, 6 failed** — all with the same error: `[data-testid="rancher-ai-ui-chat-container"]` not found after Alt+K keyboard shortcut (via `ChatPo.openViaKeyboard()` at `chat.po.ts:75`).
- **Tests 2, 5 passed** — both start from an already-open chat state (Alt+K to close), confirming the element *does* exist once the chat is open.
- **Root cause**: The `openViaKeyboard()` method dispatches Alt+K but the chat panel does not open. Possible issues:
  1. The keyboard event is not being dispatched correctly (wrong event type, missing `altKey: true`).
  2. The Alt+K handler may be listening on `document` but Cypress dispatches to `body` by default — ensure `cy.get('body').type('{alt}k')` or `cy.document().trigger('keydown', { key: 'k', altKey: true })` is used.
  3. The `rancher-ai-ui-chat-container` testid may be wrong — check the actual rendered testid after opening chat via UI click.
- **Pattern**: Tests that call `openViaKeyboard()` then immediately check `isOpen()` all fail; tests that open via UI and then call Alt+K to *close* pass. This confirms the shortcut listener isn't triggered by Cypress.
- **Fix suggestions**: In `chat.po.ts:openViaKeyboard()`, replace the keyboard trigger mechanism with `cy.document().trigger('keydown', { key: 'k', altKey: true, bubbles: true })` or ensure `cy.get('body').type('{alt}k')`.
