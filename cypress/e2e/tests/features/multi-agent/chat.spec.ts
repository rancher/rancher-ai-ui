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

  it('It should be possible to switch agents manually', () => {
    chat.console().selectAgent().checkExists();

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const item = selectAgent.agentItem('harvester');

    item.select();
    item.checkNotExists();

    selectAgent.self().contains('Harvester');

    selectAgent.open();

    const harvesterAgent = selectAgent.agentItem('harvester');

    harvesterAgent.checkSelected();
  });

  after(() => {
    cy.multiAgentEnabled(false);
  });
});