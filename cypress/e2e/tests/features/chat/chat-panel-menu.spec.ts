import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import ChatPanelMenuPo from '@/cypress/e2e/po/chat-panel-menu.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import DeleteChatPromptPo from '@/cypress/e2e/po/dialog/delete-chat.po';
import { AGENT_NAME, AGENT_NAMESPACE } from '@/cypress/e2e/blueprints/aiAgentApp';

describe('Feature: chat-panel-menu', () => {
  const chat = new ChatPo();
  const menu = new ChatPanelMenuPo();

  beforeEach(() => {
    cy.login();
    HomePagePo.goTo();
    chat.open();
    chat.isReady();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  afterEach(() => {
    cy.clearLLMResponses();
    cy.cleanChatHistory();
  });

  after(() => {
    // Created by the confirmed action of Test 10
    cy.deleteRancherResource('v1', 'pods', 'default/my-pod', false);
  });

  it('Test 1: Menu button opens the ⋮ dropdown', () => {
    menu.toggleMenu();

    cy.contains('.v-popper__popper', 'Download Messages').should('be.visible');
    cy.contains('.v-popper__popper', 'View Keyboard Shortcuts').should('be.visible');
    cy.contains('.v-popper__popper', 'Edit Configuration').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-1-menu-open');
  });

  it('Test 2: "Keyboard shortcuts" menu option opens the shortcuts popover', () => {
    menu.toggleMenu();
    menu.clickOption('View Keyboard Shortcuts');

    menu.shortcutsTitle().should('be.visible');
    menu.shortcutsRows().should('have.length.gte', 1);

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-2-shortcuts-popover');
  });

  it('Test 3: Shortcuts popover lists the correct shortcut actions', () => {
    menu.toggleMenu();
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

    menu.toggleMenu();
    menu.clickOption('Edit Configuration');

    cy.url().should('match', /\/(ai-assistant|settings)/);
    cy.contains('AI Assistant Configuration').should('be.visible');

    cy.screenshot('chat-panel-menu-test-4-configure-navigation');
  });

  it('Test 5: "Download Messages" menu option triggers a file download', () => {
    cy.enqueueLLMResponse({ text: 'Hello from AI.' });
    chat.sendMessage('Hello');
    chat.getMessage(3).isCompleted();

    menu.toggleMenu();
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

  it('Test 7: Keyboard shortcut Ctrl+Shift+H (Toggle history) opens history panel', () => {
    const history = new HistoryPo();

    history.isClosed();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}h');

    history.isOpen();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').type('{ctrl}{shift}h');

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

  it('Test 10: Auto-scroll and desktop notifications options are hidden while a confirmation is pending (Chat is disabled)', () => {
    menu.toggleMenu();
    menu.option('Auto-Scroll').should('be.visible');
    menu.option('Desktop Notifications').should('be.visible');

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   'rancher',
        mcpTool: {
          name: 'createKubernetesResource',
          args: {
            kind:      'Pod',
            name:      'my-pod',
            manifest:  `{
              apiVersion: 'v1',
              kind:       'Pod',
              metadata:   {
                name:      'my-pod',
                namespace: 'default'
              },
              spec:       {
                containers: [{
                  name:  'my-container',
                  image: 'nginx:latest'
                }]
              }
            }`,
            cluster:   'local',
            namespace: 'default'
          }
        },
      }],
      text: 'Pod created successfully.'
    });

    chat.sendMessage('Create a pod named my-pod in default namespace');

    const confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.isCompleted();

    cy.get('body').should(($body) => {
      expect($body.find('.v-popper__popper:visible:contains("Download Messages")')).to.have.length(0);
    });

    menu.toggleMenu();
    menu.option('Download Messages').should('be.visible');
    menu.option('View Keyboard Shortcuts').should('be.visible');
    menu.option('Edit Configuration').should('be.visible');
    cy.get('.v-popper__popper').filter(':visible').should('not.contain', 'Auto-Scroll').and('not.contain', 'Desktop Notifications');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-10-disabled-options');

    menu.toggleMenu();

    // Answered: the chat is enabled again and so are the options
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    chat.getMessage(4).containsText('Pod created successfully.');

    menu.toggleMenu();
    menu.option('Auto-Scroll').should('be.visible');
    menu.option('Desktop Notifications').should('be.visible');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-10-enabled-options');
  });

  it('Test 11: The open menu closes as soon as the chat becomes disabled', () => {
    menu.toggleMenu();
    menu.option('Download Messages').should('be.visible');

    // The AI agent deployment goes away: the chat is disabled while the menu is open
    cy.window().then((win: any) => {
      const store = win.$globalApp.$store;

      store.commit('management/remove', store.getters['management/byId']('apps.deployment', `${ AGENT_NAMESPACE }/${ AGENT_NAME }`));
    });

    cy.get('body').should(($body) => {
      expect($body.find('.v-popper__popper:visible:contains("Download Messages")')).to.have.length(0);
    });

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-11-menu-closed-when-disabled');
  });

  it('Test 12: Only the download, shortcuts and configuration options are shown while the chat is initializing', () => {
    // A chat without id is not initialized yet
    cy.window().then((win: any) => {
      win.$globalApp.$store.commit('rancher-ai-ui/chat/setMetadata', { chatId: null });
    });

    cy.get('[data-testid="rancher-ai-ui-chat-panel-not-ready"]').should('exist');

    menu.toggleMenu();
    menu.option('Download Messages').should('be.visible');
    menu.option('View Keyboard Shortcuts').should('be.visible');
    menu.option('Edit Configuration').should('be.visible');
    cy.get('.v-popper__popper').filter(':visible').should('not.contain', 'Auto-Scroll').and('not.contain', 'Desktop Notifications');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-panel-menu-test-12-initializing-options');
  });
});
