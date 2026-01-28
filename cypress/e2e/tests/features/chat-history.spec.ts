import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import DeleteChatPromptPo from '@/cypress/e2e/po/dialog/delete-chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

describe('History Panel', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  before(() => {
    cy.login();
    cy.cleanChatHistory();
  });

  beforeEach(() => {
    cy.login();
    cy.clearLLMResponses();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should open and close history panel', () => {
    history.open();
    history.isOpen();

    history.closeByClickOutside();
    history.isClosed();

    history.open();
    history.isOpen();

    history.closeByClickButton();
    history.isClosed();
  });

  it('It should discard empty chats from history', () => {
    history.open();
    history.createChat();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    history.open();
    history.chatItems().should('have.length', 0);
  });

  it('It should create new chats and populate the history list', () => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const request = `Chat ${ i + 1 } - request ${ j + 1 }`;
        const response = `Chat ${ i + 1 } - response ${ j + 1 }`;

        cy.enqueueLLMResponse({
          text:      response,
          chunkSize: 5
        });

        chat.sendMessage(request);

        const userMessage = chat.getMessage(2 + (j * 2));

        userMessage.containsText(request);

        const responseMessage = chat.getMessage(3 + (j * 2));

        responseMessage.isCompleted();
        responseMessage.containsText(response);
      }

      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    }

    history.open();
    for (let k = 2; k >= 0; k--) {
      history.chatItem(k).checkExists();
    }
  });

  it('It should correctly load previous chats - the order of the chats and messages is correct', () => {
    for (let i = 0; i < 3; i++) {
      history.open();

      const chatItem = history.chatItem(i);

      chatItem.checkExists();
      chatItem.name().contains(`Chat ${ 3 - i } - request 1`);

      chatItem.select();
      chat.isReady();

      for (let j = 0; j < 3; j++) {
        const request = `Chat ${ 3 - i } - request ${ j + 1 }`;
        const response = `Chat ${ 3 - i } - response ${ j + 1 }`;

        const lastUserMessage = chat.getMessage(1 + (j * 2));

        lastUserMessage.scrollIntoView();
        lastUserMessage.containsText(request);

        const lastResponseMessage = chat.getMessage(2 + (j * 2));

        lastResponseMessage.scrollIntoView();
        lastResponseMessage.containsText(response);
      }
    }
  });

  it('It should delete chats from history', () => {
    history.open();

    for (let i = 2; i > 0; i--) {
      history.chatItem(i).checkExists();

      history.chatItem(i).menu().doAction('delete-chat');

      const deleteChatPrompt = new DeleteChatPromptPo();

      deleteChatPrompt.confirm();

      history.chatItems().should('have.length', i);
    }
  });

  it('It should delete active chats', () => {
    history.open();

    history.chatItem(0).select();
    chat.isReady();

    const lastUserMessage = chat.getMessage(5);

    lastUserMessage.scrollIntoView();
    lastUserMessage.containsText('Chat 3 - request 3');

    const lastResponseMessage = chat.getMessage(6);

    lastResponseMessage.scrollIntoView();
    lastResponseMessage.containsText('Chat 3 - response 3');

    history.open();

    const chatItem = history.chatItem(0);

    chatItem.isActive();
    chatItem.menu().doAction('delete-chat');

    const deleteChatPrompt = new DeleteChatPromptPo();

    deleteChatPrompt.confirm();

    // When the active chat is deleted, the chat panel initializes a new chat
    chat.isReady();
    history.isClosed();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    const otherMessage = chat.getMessage(2);

    otherMessage.checkNotExists();

    history.open();
    history.chatItems().should('have.length', 0);
  });

  after(() => {
    cy.login();
    cy.cleanChatHistory();
  });
});