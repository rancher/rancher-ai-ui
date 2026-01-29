import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Multi Agent Chat', () => {
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

  it('It should display the multi-agent select interface in the console', () => {
    chat.console().selectAgent().checkExists();
  });

  it.skip('It should be possible to switch agents manually', () => {});
  it.skip('It should display the correct agent info when switching agents (agent names, tooltips)', () => {});
  it.skip('It should display additional agent info in the agent selection dropdown', () => {});
  it.skip('It should remember the last selected agent across messages', () => {});

  after(() => {
    cy.multiAgentEnabled(false);
  });
});