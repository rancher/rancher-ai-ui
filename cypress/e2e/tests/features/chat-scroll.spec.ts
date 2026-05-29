import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Feature: chat-scroll', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  afterEach(() => {
    cy.cleanChatHistory();
  });

  it('Test 1: Scroll button is hidden for a short conversation', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();

    chat.scrollButton().checkNotExists();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-1-hidden-on-short-conversation');
  });

  it('Test 2: Scroll button appears when user scrolls up in a long conversation', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();

    const longText = 'Lorem ipsum dolor sit amet, '.repeat(80);

    for (let i = 0; i < 5; i++) {
      cy.enqueueLLMResponse({ text: longText });
      chat.sendMessage(`Message ${ i + 1 }`);
      chat.getMessage(2 + i * 2 + 1).isCompleted();
    }

    cy.get('.chat-messages').scrollTo('top');

    chat.scrollButton().checkExists();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-2-visible-when-scrolled-up');
  });

  it('Test 3: Clicking scroll button scrolls to bottom and hides the button', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();

    const longText = 'Lorem ipsum dolor sit amet, '.repeat(80);

    for (let i = 0; i < 5; i++) {
      cy.enqueueLLMResponse({ text: longText });
      chat.sendMessage(`Message ${ i + 1 }`);
      chat.getMessage(2 + i * 2 + 1).isCompleted();
    }

    cy.get('.chat-messages').scrollTo('top');

    chat.scrollButton().checkExists();
    chat.scrollButton().self().click();

    chat.scrollButton().checkNotExists();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-3-button-hidden-after-click');
  });

  it('Test 4: Auto-scroll when new AI message arrives (user is at bottom)', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();

    const mediumText = 'Some AI response text. '.repeat(20);

    for (let i = 0; i < 3; i++) {
      cy.enqueueLLMResponse({ text: mediumText });
      chat.sendMessage(`Question ${ i + 1 }`);
      chat.getMessage(2 + i * 2 + 1).isCompleted();
    }

    chat.scrollButton().checkNotExists();
    chat.getMessage(7).isCompleted();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-4-no-button-when-auto-scrolling');
  });

  it('Test 5: Auto-scroll is suppressed when user has scrolled up', () => {
    HomePagePo.goTo();

    chat.open();
    chat.isReady();
    chat.getMessage(1).isCompleted();

    const longText = 'Lorem ipsum dolor sit amet, '.repeat(80);

    for (let i = 0; i < 5; i++) {
      cy.enqueueLLMResponse({ text: longText });
      chat.sendMessage(`Message ${ i + 1 }`);
      chat.getMessage(2 + i * 2 + 1).isCompleted();
    }

    cy.get('.chat-messages').scrollTo('top');
    chat.scrollButton().checkExists();

    cy.enqueueLLMResponse({ text: 'Lorem ipsum dolor sit amet, '.repeat(80) });
    chat.sendMessage('One more message');
    // Sending the user message forces a scroll-to-bottom (force=true in the MutationObserver).
    // Scroll back up immediately to test that the AI response auto-scroll is suppressed.
    cy.get('.chat-messages').scrollTo('top');
    // Wait for AI response to appear (box 13 exists)
    cy.get('[data-testid="rancher-ai-ui-chat-message-box-13"]').should('exist');
    // Scroll button must still be visible — AI response auto-scroll is suppressed when user is scrolled up
    chat.scrollButton().checkExists();

    cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-5-button-stays-when-user-scrolled-up');
  });

  describe('disabled state', () => {
    afterEach(() => {
      cy.uninstallRancherAIService();
      cy.installRancherAIService();
    });

    it('Test 6: Scroll button is not shown when chat panel is disabled', () => {
      HomePagePo.goTo();

      cy.installRancherAIService({ waitForAIServiceReady: false });
      chat.rancherHeader.askLizButton().click();
      chat.isNotReady();

      chat.scrollButton().checkNotExists();

      cy.get('[data-testid="rancher-ai-ui-chat-container"]').screenshot('chat-scroll-test-6-no-button-when-disabled');
    });
  });
});
