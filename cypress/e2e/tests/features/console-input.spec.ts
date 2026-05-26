import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

describe('Feature: console-input', () => {
  const chat = new ChatPo();
  const console = new ConsolePo();

  beforeEach(() => {
    cy.login();
    HomePagePo.goTo();
    chat.open();
    chat.isReady();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  describe('Prompt history and autocomplete', () => {
    it('Test 1: ArrowUp fills in the last sent message as autocomplete', () => {
      cy.enqueueLLMResponse({ text: 'Hello from AI.' });
      chat.sendMessage('First prompt');
      chat.getMessage(3).isCompleted();

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');

      console.autocompleteOverlay()
        .should('be.visible')
        .and('contain.text', 'First prompt');
      console.tabBadge()
        .should('be.visible')
        .and('contain.text', 'Tab');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-1-arrowup-shows-autocomplete');
    });

    it('Test 2: Tab accepts the autocomplete suggestion', () => {
      cy.enqueueLLMResponse({ text: 'Hello from AI.' });
      chat.sendMessage('First prompt');
      chat.getMessage(3).isCompleted();

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');

      console.autocompleteOverlay().should('be.visible');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{tab}', { force: true });

      console.autocompleteOverlay().should('not.exist');
      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]')
        .should('have.value', 'First prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-2-tab-accepts-autocomplete');
    });

    it('Test 3: Multiple ArrowUp presses navigate to older messages', () => {
      cy.enqueueLLMResponse({ text: 'AI response 1.' });
      chat.sendMessage('First prompt');
      chat.getMessage(3).isCompleted();

      cy.enqueueLLMResponse({ text: 'AI response 2.' });
      chat.sendMessage('Second prompt');
      chat.getMessage(5).isCompleted();

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      console.autocompleteOverlay().should('contain.text', 'Second prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      console.autocompleteOverlay().should('contain.text', 'First prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      console.autocompleteOverlay().should('contain.text', 'First prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-3-multiple-arrowup-older-messages');
    });

    it('Test 4: ArrowDown navigates forward in prompt history', () => {
      cy.enqueueLLMResponse({ text: 'AI response 1.' });
      chat.sendMessage('First prompt');
      chat.getMessage(3).isCompleted();

      cy.enqueueLLMResponse({ text: 'AI response 2.' });
      chat.sendMessage('Second prompt');
      chat.getMessage(5).isCompleted();

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      console.autocompleteOverlay().should('contain.text', 'First prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{downarrow}');
      console.autocompleteOverlay().should('contain.text', 'Second prompt');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{downarrow}');
      console.autocompleteOverlay().should('not.exist');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-4-arrowdown-forward-navigation');
    });

    it('Test 5: Typing clears the autocomplete overlay', () => {
      cy.enqueueLLMResponse({ text: 'Hello from AI.' });
      chat.sendMessage('First prompt');
      chat.getMessage(3).isCompleted();

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{uparrow}');
      console.autocompleteOverlay().should('be.visible');

      cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('x');
      console.autocompleteOverlay().should('not.exist');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-5-typing-clears-autocomplete');
    });
  });

  describe('Console footer', () => {
    it('Test 6: LLM model label is visible in the console footer', () => {
      console.llmModelLabel()
        .should('be.visible')
        .and('contain.text', 'Uses AI, running');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-6-llm-model-label');
    });

    it('Test 7: Verify results disclaimer popover opens with correct content', () => {
      console.verifyResultsLink().click();

      /**
       * The popover is rendered via TextLabel.vue which uses RcDropdown (floating-vue).
       * The popper is teleported outside the chat container, so we use the global selector.
       */
      cy.get('.v-popper__popper')
        .filter(':visible')
        .should('contain.text', 'Verify All Results')
        .and('contain.text', 'Use at Your Own Risk')
        .and('contain.text', 'Do Not Share Secrets');

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('console-input-test-7-verify-results-popover');
    });
  });
});
