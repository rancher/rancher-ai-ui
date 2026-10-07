import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Message Planning', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
    cy.updateAiAssistantConfigs({
      PLAN_ENABLED:          'true',
      PLAN_APPROVAL_ENABLED: 'true'
    });
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('Show planning message', () => {
    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueuePlanningResponse([
      {
        label:  'Create a new namespace in the cluster \'local\'.',
        agent:  'rancher',
        result: {
          status:  'completed',
          message: 'Namespace created'
        }
      },
      {
        label:  'Create a pod inside the newly created namespace in cluster \'local\'.',
        agent:  'rancher',
        result: {
          status:  'failed',
          message: 'Failed to create Pod'
        }
      }
    ]);

    chat.sendMessage('Create a namespace and a Pod in it');

    // TODO
    cy.contains('Awaiting approval to execute the following tasks').should('be.visible');
    cy.contains('Start Execution').click();

    cy.contains('Execution failed').should('exist');
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
    cy.updateAiAssistantConfigs({
      PLAN_ENABLED:          'false',
      PLAN_APPROVAL_ENABLED: 'false'
    });
  });
});
