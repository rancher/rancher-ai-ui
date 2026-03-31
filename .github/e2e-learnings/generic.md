# E2E Generic Learnings

Accumulated knowledge from the E2E generic verifier. Used by the spec writer,
fixer, and verifier to avoid repeating mistakes.

## Selector Corrections

<!-- Map wrong selectors to correct ones -->

## Common Failure Patterns

<!-- Patterns that cause test failures repeatedly -->

## Cypress Best Practices

- Screenshots MUST be taken on `[data-testid="rancher-ai-ui-chat-container"]`, not viewport
- Always add `cy.wait(500)` before `cy.screenshot()`
- Never use `cy.type('{tab}')` — not supported in Cypress
- Keyboard shortcuts must use combined modifier syntax: `{alt+k}`, `{ctrl+shift+o}`
- Stub clipboard before copy tests: `cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').resolves())`
- Always call `cy.enqueueLLMResponse()` before sending a message that expects a reply

## Feature-Specific Notes

<!-- Notes about specific feature areas -->

## Anti-Patterns

- Do NOT rewrite working tests when fixing failures
- Do NOT use `npx cypress` — use `yarn e2e`
- Do NOT hardcode wait times longer than 2000ms unless absolutely necessary
