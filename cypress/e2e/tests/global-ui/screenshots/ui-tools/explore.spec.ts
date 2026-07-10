import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { getSpecName, Screenshot } from '@/cypress/e2e/utils';
import { testPodDefault } from '~/cypress/e2e/blueprints/pod';

describe(`UI tool: ${ getSpecName() }`, () => {
  const chat = new ChatPo();

  const screenshot = new Screenshot();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();

    cy.createRancherResource('v1', 'pods', JSON.stringify(testPodDefault), false);
  });

  it('screenshots', () => {
    cy.setFullScreen();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.checkExists();

    welcomeMessage.isCompleted();

    welcomeMessage.self().realClick();

    cy.enqueueLLMResponse({
      text:      ['See your pods here:'],
      uiTools:   [
        {
          name: 'explore',
          args: {
            route:   'pods',
            cluster: 'local',
            label:   'View Pods'
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz! Where are my pods located?');

    const resultMessage = chat.getMessage(3);

    resultMessage.isCompleted();

    const tool = resultMessage.tool().explore('pods');

    tool.should('be.visible');

    cy.wait(1000);

    // Show tooltip
    tool.realMouseUp();

    cy.wait(2000);

    screenshot.take();

    tool.realClick();

    // Wait for the table to load and display the pod name
    cy.get('[data-testid="sortable-cell-0-1"]').contains('test-pod').should('be.visible');

    resultMessage.scrollIntoView();

    cy.wait(1000);

    resultMessage.self().realClick();

    cy.wait(2000);

    tool.should('be.visible');

    screenshot.take();
  });

  after(() => {
    cy.login();
    cy.uninstallUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();

    cy.deleteRancherResource('v1', 'pods', `${ testPodDefault.metadata.namespace }/${ testPodDefault.metadata.name }`, false);
  });
});
