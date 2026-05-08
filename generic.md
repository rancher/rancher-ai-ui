# E2E Generic Learnings

## Selector Corrections
- `.context-dropdown` — used in Test 5 to find content 'local'; if times out, the dropdown may not be open or uses a different selector
- `.context-trigger` — used in Test 7 inside `<div.chat-context.disabled-panel>`; element may not exist when panel is disabled

## Common Failure Patterns
- **`.context-dropdown` content timeout (Test 5)**: The dropdown for "Add context" may not render the 'local' item within 10s. Check that the dropdown is opened before asserting content, and verify the selector matches the actual DOM element.
- **`.context-trigger` not found in disabled panel (Test 7)**: When the chat is not ready, the context trigger element may not be rendered at all inside `.chat-context.disabled-panel`. The test expects to find `.context-trigger` inside the disabled panel, but the element may be conditionally rendered only when enabled.
- **afterEach cleanup 503 (Test 7 hook)**: The DELETE cleanup call to `/proxy/v1/api/chats` fails with 503 when the AI agent service is unavailable (`no endpoints available for service "http:rancher-ai-agent:80"`). Add `failOnStatusCode: false` to the cleanup `cy.request()` or guard it with a try/catch / conditional.

## Cypress Best Practices
- Add `failOnStatusCode: false` to cleanup `cy.request()` calls in `afterEach` hooks to prevent infrastructure unavailability from cascading into test failures and skipping subsequent tests.
- Before asserting dropdown content, ensure the dropdown is actually open (click trigger first, wait for it).
- For disabled-state tests, check whether the element is conditionally rendered or just visually disabled — adjust selectors accordingly.

## Feature-Specific Notes (context-selection)
- Tests 1–4 and 6 are stable.
- Test 5 (toggle context via dropdown) is flaky: `.context-dropdown` selector or its content 'local' not reliably found.
- Test 7 (panel disabled while chat not ready): `.context-trigger` may not exist in the DOM when panel is disabled; test may need to assert on the parent `.chat-context.disabled-panel` instead.
- The `afterEach` hook deletes chat history via API; this fails when the AI agent backend is unavailable — add `failOnStatusCode: false`.

## Anti-Patterns
- Do NOT assert `.context-trigger` exists inside a disabled panel without checking if it's rendered conditionally.
- Do NOT use `cy.request()` for cleanup without `failOnStatusCode: false` when the backend may be unavailable in CI.
