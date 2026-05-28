import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Feature: chat-open-shortcut', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
    HomePagePo.goTo();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  it('Test 1: Alt+K opens the chat panel when it is closed', () => {
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('not.exist');

    chat.openViaKeyboard();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('exist');
    cy.get('[data-testid="rancher-ai-ui-chat-panel-ready"]').should('exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-open-shortcut-test-1-opens-chat');
  });

  it('Test 2: Alt+K closes the chat panel when it is open', () => {
    chat.open();
    chat.isReady();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    chat.closeViaKeyboard();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('not.exist');

    cy.screenshot('chat-open-shortcut-test-2-closes-chat');
  });

  it('Test 3: Alt+K toggles the chat panel multiple times', () => {
    chat.openViaKeyboard();
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('exist');

    const welcomeMessage1 = chat.getMessage(1);

    welcomeMessage1.isCompleted();

    chat.closeViaKeyboard();
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('not.exist');

    chat.openViaKeyboard();
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('exist');
    cy.get('[data-testid="rancher-ai-ui-chat-panel-ready"]').should('exist');

    const welcomeMessage2 = chat.getMessage(1);

    welcomeMessage2.isCompleted();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-open-shortcut-test-3-toggle-multiple');
  });

  it('Test 4: Chat is fully functional after being opened with Alt+K', () => {
    chat.openViaKeyboard();
    chat.isReady();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({ text: 'Hello from keyboard.' });
    chat.sendMessage('Hello');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hello');

    const aiMessage = chat.getMessage(3);

    aiMessage.isCompleted();
    aiMessage.containsText('Hello from keyboard.');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-open-shortcut-test-4-functional-after-keyboard-open');
  });

  it('Test 5: Alt+K closes the chat when the input textarea is focused', () => {
    chat.open();
    chat.isReady();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').click().type('partial message');

    cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').type('{alt}k');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('not.exist');

    cy.screenshot('chat-open-shortcut-test-5-closes-when-textarea-focused');
  });

  it('Test 6: Alt+K works from a non-Home page (Cluster Dashboard)', () => {
    const clusterDashboard = new ClusterDashboardPagePo('local');

    clusterDashboard.goTo();

    chat.openViaKeyboard();
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('exist');
    cy.get('[data-testid="rancher-ai-ui-chat-panel-ready"]').should('exist');

    chat.closeViaKeyboard();
    cy.get('[data-testid="rancher-ai-ui-chat-container"]').should('not.exist');

    cy.screenshot('chat-open-shortcut-test-6-works-on-cluster-dashboard');
  });
});
