import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Feature: message-actions', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
    HomePagePo.goTo();
    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();
  });

  afterEach(() => cy.cleanChatHistory());

  it('Test 1: Copy AI response to clipboard', () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboardWrite');
    });

    cy.enqueueLLMResponse({ text: 'The copy response text.' });
    chat.sendMessage('Copy this message');
    chat.getMessage(3).isCompleted();

    chat.getMessage(3).copyButton().click();

    cy.get('@clipboardWrite').should('have.been.calledWith', 'The copy response text.');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-1-copy-ai-response');
  });

  it('Test 2: Copy button shows success checkmark feedback', () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboardWrite');
    });

    cy.enqueueLLMResponse({ text: 'Feedback test.' });
    chat.sendMessage('Test feedback');
    chat.getMessage(3).isCompleted();

    chat.getMessage(3).copyButton().click();

    cy.get('[data-testid="rancher-ai-ui-bubble-btn-icon-copy"] .icon').should('have.class', 'icon-checkmark');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-2-copy-success-checkmark');
  });

  it('Test 3: Copy user message to clipboard', () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboardWrite');
    });

    cy.enqueueLLMResponse({ text: 'Any response.' });
    chat.sendMessage('User copy test');
    chat.getMessage(3).isCompleted();

    chat.getMessage(2).copyButton().click();

    cy.get('@clipboardWrite').should('have.been.calledWith', 'User copy test');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-3-copy-user-message');
  });

  it('Test 4: Edit-before-resend populates textarea', () => {
    cy.enqueueLLMResponse({ text: 'AI reply.' });
    chat.sendMessage('Original prompt text');
    chat.getMessage(3).isCompleted();

    chat.getMessage(2).editButton().click();

    cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').should('have.value', 'Original prompt text');
    cy.get('[data-testid="rancher-ai-ui-chat-input-textarea"]').should('be.focused');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-4-edit-before-resend-textarea');
  });

  it('Test 5: Edit-before-resend button shows success checkmark', () => {
    cy.enqueueLLMResponse({ text: 'AI reply.' });
    chat.sendMessage('Original prompt text');
    chat.getMessage(3).isCompleted();

    chat.getMessage(2).editButton().click();

    cy.get('[data-testid="rancher-ai-ui-bubble-btn-icon-edit"] .icon').should('have.class', 'icon-checkmark');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-5-edit-success-checkmark');
  });

  it('Test 6: Resend button re-sends the user message', () => {
    cy.enqueueLLMResponse({ text: 'First reply.' });
    chat.sendMessage('Resend this prompt');
    chat.getMessage(3).isCompleted();

    cy.enqueueLLMResponse({ text: 'Resent reply.' });
    chat.getMessage(2).resendButton().click();

    chat.getMessage(4).containsText('Resend this prompt');
    chat.getMessage(5).isCompleted();
    chat.getMessage(5).containsText('Resent reply.');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-6-resend-message');
  });

  it('Test 7: Message action buttons not shown on pending-confirmation messages', () => {
    cy.enqueueLLMResponse({
      text:    'Pod created successfully.',
      mcpTool: {
        name: 'createKubernetesResource',
        args: {
          name:      'test-pod',
          kind:      'Pod',
          namespace: 'default',
          cluster:   'local',
          resource:  {
            apiVersion: 'v1',
            kind:       'Pod',
            metadata:   {
              name:      'test-pod',
              namespace: 'default'
            }
          }
        }
      }
    });
    chat.sendMessage('Show pending confirmation');

    const confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    // The confirm button verifies the pending-confirmation state is active
    cy.get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"]').scrollIntoView().should('exist');

    chat.getMessage(2).editButton().self().should('not.exist');
    chat.getMessage(2).resendButton().self().should('not.exist');

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('message-actions-test-7-actions-hidden-pending-confirmation');
  });
});
