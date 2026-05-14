---
# Shared fragment: Cypress + Rancher AI UI testing reference
# Import with: imports: [shared/cypress-rancher-ai.md]
#
# Provides the AI agent with Cypress conventions, page objects,
# custom commands, and selectors for the Rancher AI UI extension.
---

<!--
# Cypress + Rancher AI UI Testing Reference
#
# This shared fragment gives any E2E agentic workflow the context
# needed to write and fix Cypress specs for the Rancher AI UI extension.
#
# Usage:
#   imports:
#     - shared/cypress-rancher-ai.md
-->

<!-- BEGIN SKILL REFERENCE — injected into agent context -->

## Cypress Quick Reference for Rancher AI UI

### Setup & Running

Dependencies are in `package.json`. Install with `yarn install`.

Run a spec:
```bash
TEST_SKIP=setup \
TEST_PASSWORD=admin1234 \
TEST_USERNAME=admin \
CYPRESS_BASE_URL=https://localhost:8005 \
NODE_TLS_REJECT_UNAUTHORIZED=0 \
yarn cypress:run --spec cypress/e2e/tests/features/<spec>.spec.ts \
  --config video=true,screenshotOnRunFailure=true
```

### Imports & Setup Pattern

```typescript
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

beforeEach(() => { cy.login(); });
afterEach(() => cy.cleanChatHistory());
```

**Important conventions:**
- Place `cy.login()` in `beforeEach`, never repeat it inside individual `it()` blocks
- Place `cy.cleanChatHistory()` in `afterEach` for cleanup
- If a test modifies shared infrastructure state (e.g. installs/uninstalls the AI service),
  isolate it in a nested `describe` with its own `afterEach` that tears down the state
- Do NOT use `cy.wait(500)` before screenshots — Cypress retries assertions automatically.
  The `.should()` assertions before a screenshot act as implicit waits.
- Page Object methods should scope selectors within their container using `this.self().find(...)`
  instead of global `cy.get(...)`. Only use global selectors for elements rendered outside
  the component tree (e.g. teleported poppers/modals).
- Encapsulate fragile third-party selectors (like `.v-popper__popper`) inside Page Object
  methods with documenting comments, so they can be updated in one place if the library changes.
- Encapsulate internal DOM traversal (e.g. `.vs__selected.tag .vs__deselect`) in named PO
  methods — any non-trivial selector chain belongs in the Page Object, not the spec.
- Specs should NEVER call `.self().find(...)` directly on a Page Object. If a spec needs
  to query the DOM, the PO should expose a method for it. The spec only calls PO methods.
- Never use conditional `afterEach` (e.g. `if (!this.currentTest?.title.includes(...))`).
  Use nested `describe` blocks with their own `afterEach` for state-changing tests instead.

### Page Objects

| Page Object | Import Path | Key Methods |
|-------------|-------------|-------------|
| `ChatPo` | `@/cypress/e2e/po/chat.po` | `open()`, `close()`, `isReady()`, `sendMessage(text)`, `getMessage(id)` |
| `ConsolePo` | `@/cypress/e2e/po/console.po` | `textarea()`, `sendMessage(text)` |
| `HistoryPo` | `@/cypress/e2e/po/history.po` | `isOpen()`, `isClosed()` |

### Custom Commands

| Command | Description |
|---------|-------------|
| `cy.login()` | Log into Rancher using env credentials |
| `cy.enqueueLLMResponse({ text })` | Queue a mock AI response |
| `cy.cleanChatHistory()` | Clear all chat history |
| `cy.installRancherAIService()` | Install the AI service |

### Known `data-testid` Selectors

| Selector | Element |
|----------|---------|
| `rancher-ai-ui-chat-container` | Chat panel root |
| `rancher-ai-ui-chat-panel-ready` | Panel loaded indicator |
| `rancher-ai-ui-chat-close-button` | Close chat button |
| `rancher-ai-ui-chat-history-button` | Toggle history button |
| `rancher-ai-ui-chat-console` | Console area |
| `rancher-ai-ui-chat-input-textarea` | Message input textarea |
| `rancher-ai-ui-chat-menu-button` | Header ⋮ menu |
| `rancher-ai-ui-delete-chat-confirm-button` | Confirm delete in modal |
| `rancher-ai-ui-multi-agent-select` | Agent selector dropdown |

### Keyboard Shortcuts

```typescript
const isMac = Cypress.platform === 'darwin';

// Open/Close chat (Alt+K on Linux, ⌘+Shift+K on Mac)
cy.get('body').type(isMac ? '{meta}{shift}k' : '{alt}k');

// Inside chat panel (Ctrl+Shift+<key> on Linux)
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type('{ctrl}{shift}o');           // New chat
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type('{ctrl}{shift}s');           // Toggle history
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type('{ctrl}{shift}c');           // Copy last response
cy.get('[data-testid="rancher-ai-ui-chat-container"]')
  .type('{ctrl}{shift}{backspace}'); // Delete chat

// Prompt history in textarea
cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
  .type('{uparrow}');   // Previous prompt
cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
  .type('{downarrow}'); // Next prompt
cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
  .type('{tab}', { force: true }); // Accept suggestion
```

### Tips

- Cypress handles self-signed certs via `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Use `cy.wait(500)` between rapid keyboard actions for animations (NOT before screenshots)
- The LLM mock service is pre-configured; `enqueueLLMResponse` queues replies
- Cypress video recording is enabled with `--config video=true`
- Screenshots are saved to `cypress/screenshots/` by default
- Mock AI responses before sending messages:
  ```typescript
  cy.enqueueLLMResponse({ text: 'Hello from AI.' });
  chat.sendMessage('Hello');
  ```
- For tests that install/uninstall the AI service, isolate them in a nested `describe`
  with cleanup in `afterEach`. The `afterEach` must **reinstall** the service after
  uninstalling to leave the environment clean for subsequent spec files:
  ```typescript
  describe('disabled state', () => {
    afterEach(() => {
      cy.uninstallRancherAIService();
      cy.installRancherAIService();
    });
    it('...', () => { cy.installRancherAIService({ waitForAIServiceReady: false }); ... });
  });
  ```
- Always scope Page Object selectors with `this.self().find(...)` instead of global `cy.get(...)`
- Specs should only call PO methods — never use `po.self().find(...)` directly in a spec
- Encapsulate multi-step DOM traversal in named PO methods (e.g. `removeFirstTag()`)
- Never use conditional `afterEach` with `this.currentTest` — use nested `describe` instead
- Use Cypress implicit waiting via `.should()` assertions — avoid explicit `cy.wait()` calls

<!-- END SKILL REFERENCE -->
