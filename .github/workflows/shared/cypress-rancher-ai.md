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

before(() => cy.login());
beforeEach(() => { cy.login(); HomePagePo.goTo(); });
afterEach(() => cy.cleanChatHistory());
```

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
- Use `cy.wait(500)` between rapid keyboard actions for animations
- The LLM mock service is pre-configured; `enqueueLLMResponse` queues replies
- Cypress video recording is enabled with `--config video=true`
- Screenshots are saved to `cypress/screenshots/` by default
- Mock AI responses before sending messages:
  ```typescript
  cy.enqueueLLMResponse({ text: 'Hello from AI.' });
  chat.sendMessage('Hello');
  ```

<!-- END SKILL REFERENCE -->
