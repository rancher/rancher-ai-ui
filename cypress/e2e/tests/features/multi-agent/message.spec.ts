import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Multi Agent Messages', () => {
  const chat = new ChatPo();

  before(() => {
    cy.multiAgentEnabled(true);
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should display the auto-select agent on assistant messages', () => {
    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    const responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();

    responseMessage.containsText('Rancher (Auto)');
  });

  it.skip('It should parse messages correctly when agent selection is adaptive', () => {});
  it.skip('It should parse messages correctly when agent selection is manual', () => {});
  it.skip('It should display the agent selection in history messages', () => {});
  it.skip('It should remember the last selected agent across messages', () => {});
  it.skip('It should show the name of disabled or deleted agents (history)', () => {});

  after(() => {
    cy.multiAgentEnabled(false);
  });
});