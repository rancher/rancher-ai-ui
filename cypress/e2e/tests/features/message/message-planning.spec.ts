import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Message Planning', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('Show planning message', () => {
    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    const msg = {
      'raw': {
        'type':    'AIMessage',
        'content': '{"subtasks": [{"task": "Do everything", "agent": "single_agent", "status": "pending"}]}'
      },
      'parsed': {
        'subtasks': [
          {
            'task':   'Do everything the user asked',
            'agent':  'single_agent',
            'status': 'pending'
          }
        ]
      }
    };

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
  });
});
