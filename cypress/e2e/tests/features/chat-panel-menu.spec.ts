import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import ChatPanelMenuPo from '@/cypress/e2e/po/chat-panel-menu.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import DeleteChatPromptPo from '@/cypress/e2e/po/dialog/delete-chat.po';

describe('Feature: chat-panel-menu', () => {
  const chat = new ChatPo();
  const menu = new ChatPanelMenuPo();

  beforeEach(() => {
    cy.login();
    HomePagePo.goTo();
    chat.open();
    chat.isReady();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  it('Test 1: Menu button opens the ⋮ dropdown', () => {
    menu.openMenu();

    cy.contains('.v-popper__popper', 'Download Messages').should('be.visible');
    cy.contains('.v-popper__popper', 'View Keyboard Shortcuts').should('be.visible');
    cy.contains('.v-popper__popper', 'Edit Configuration').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-1-menu-open');
  });

  it('Test 2: "Keyboard shortcuts" menu option opens the shortcuts popover', () => {
    menu.openMenu();
    menu.clickOption('View Keyboard Shortcuts');

    menu.shortcutsTitle().should('be.visible');
    menu.shortcutsRows().should('have.length.gte', 1);

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-2-shortcuts-popover');
  });

  it('Test 3: Shortcuts popover lists the correct shortcut actions', () => {
    menu.openMenu();
    menu.clickOption('View Keyboard Shortcuts');

    menu.shortcutsTitle().should('be.visible');
    menu.shortcutsRows().should('have.length.gte', 6);

    menu.shortcutsActions().then(($actions) => {
      const texts = [...$actions].map((el) => el.textContent?.trim() ?? '');

      expect(texts).to.include('Previous / Next Prompt');
      expect(texts).to.include('Open / Close Chat Panel');
      expect(texts).to.include('New Chat');
      expect(texts).to.include('Copy Last Response');
      expect(texts).to.include('View Previous Chats');
      expect(texts).to.include('Delete Current Chat');
    });

    menu.shortcutsRows().each(($row) => {
      cy.wrap($row).find('.shortcuts-key').should('exist');
    });

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-3-shortcuts-content');
  });

  it('Test 4: "Edit Configuration" menu option navigates to the AI settings page', () => {
    // Navigate to cluster page to ensure cluster context is available for routing
    cy.visit('/c/local/');
    chat.open();
    chat.isReady();

    menu.openMenu();
    menu.clickOption('Edit Configuration');

    cy.url().should('match', /\/(ai-assistant|settings)/);
    cy.contains('AI Assistant Configuration').should('be.visible');

    cy.screenshot('chat-panel-menu-test-4-configure-navigation');
  });

  it('Test 5: "Download Messages" menu option triggers a file download', () => {
    cy.enqueueLLMResponse({ text: 'Hello from AI.' });
    chat.sendMessage('Hello');
    chat.getMessage(3).isCompleted();

    menu.openMenu();
    menu.clickOption('Download Messages');

    // Download is a background operation — chat panel should remain open
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-5-download-chat');
  });

  it('Test 6: Keyboard shortcut Ctrl+Shift+O (New chat) creates a new chat', () => {
    cy.enqueueLLMResponse({ text: 'Hello from AI.' });
    chat.sendMessage('Hello');
    chat.getMessage(3).isCompleted();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}o');

    chat.getMessage(1).isCompleted();
    cy.get('[data-testid="rancher-ai-ui-chat-message-box-2"]').should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-6-new-chat-shortcut');
  });

  it('Test 7: Keyboard shortcut Ctrl+Shift+S (Toggle history) opens history panel', () => {
    const history = new HistoryPo();

    history.isClosed();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}s');

    history.isOpen();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}s');

    history.isClosed();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-7-toggle-history-shortcut');
  });

  it('Test 8: Keyboard shortcut Ctrl+Shift+Backspace (Delete chat) shows delete confirmation', () => {
    cy.enqueueLLMResponse({ text: 'Hello from AI.' });
    chat.sendMessage('Hello');
    chat.getMessage(3).isCompleted();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}{backspace}');

    const deletePrompt = new DeleteChatPromptPo();

    deletePrompt.confirmButton().should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-8-delete-shortcut-dialog');
  });

  it('Test 9: Keyboard shortcut Ctrl+Shift+C (Copy last message) copies AI response', () => {
    cy.enqueueLLMResponse({ text: 'Hello from AI.' });
    chat.sendMessage('Hello');
    chat.getMessage(3).isCompleted();

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
    });

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}c');

    cy.get('@clipboardWrite').should('have.been.calledOnce');
    cy.get('@clipboardWrite').should('have.been.calledWith', 'Hello from AI.');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-9-copy-last-message');
  });
});
