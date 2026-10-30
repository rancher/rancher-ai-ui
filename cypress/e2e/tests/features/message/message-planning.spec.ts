import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Message Planning', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
  });

  describe('Planning without approval', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
      cy.clearLLMResponses();
      cy.updateAiAssistantConfigs({
        PLAN_ENABLED:          'true',
        PLAN_APPROVAL_ENABLED: 'false'
      });
    });

    beforeEach(() => {
      cy.login();
      cy.cleanChatHistory();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('Execution succeeds', () => {
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
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().should('not.contain', 'Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.cancelButton().should('not.exist');

      planningMessage.header().contains('All tasks have been completed');

      planningMessage.item(0).icon().should('have.class', 'icon-checkmark');
      planningMessage.item(1).icon().should('have.class', 'icon-checkmark');
    });

    it('Execution fails', () => {
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
          agent:  'fleet',
          result: {
            status:  'failed',
            message: 'Failed to create Pod'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().should('not.contain', 'Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.cancelButton().should('not.exist');

      planningMessage.header().contains('Plan execution has been stopped');

      planningMessage.item(0).icon().should('have.class', 'icon-checkmark');
      planningMessage.item(1).icon().should('have.class', 'icon-error');

      const feedbackMessage = chat.getMessage(3);

      feedbackMessage.tool().selectOption(0).label()
        .should('be.visible')
        .and('contain.text', 'Retry');
      feedbackMessage.tool().selectOption(1).label()
        .should('be.visible')
        .and('contain.text', 'Restart');
      feedbackMessage.tool().selectOption(2).label()
        .should('be.visible')
        .and('contain.text', 'Request more');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });
  });

  describe('Planning with approval', () => {
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
      cy.cleanChatHistory();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('Execution succeeds', () => {
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
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.header().contains('All tasks have been completed');
      planningMessage.status().contains('Completed');

      planningMessage.cancelButton().should('not.exist');

      planningMessage.item(0).icon().should('have.class', 'icon-checkmark');
      planningMessage.item(1).icon().should('have.class', 'icon-checkmark');
    });

    it('Execution fails', () => {
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
          agent:  'fleet',
          result: {
            status:  'failed',
            message: 'Failed to create Pod'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.header().contains('Plan execution has been stopped');
      planningMessage.status().contains('Execution failed');

      planningMessage.cancelButton().should('not.exist');

      planningMessage.item(0).icon().should('have.class', 'icon-checkmark');
      planningMessage.item(1).icon().should('have.class', 'icon-error');

      const feedbackMessage = chat.getMessage(3);

      feedbackMessage.tool().selectOption(0).label()
        .should('be.visible')
        .and('contain.text', 'Retry');
      feedbackMessage.tool().selectOption(1).label()
        .should('be.visible')
        .and('contain.text', 'Restart');
      feedbackMessage.tool().selectOption(2).label()
        .should('be.visible')
        .and('contain.text', 'Request more');
    });

    it('Execution cancelled', () => {
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
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.cancel();

      planningMessage.header().contains('Plan execution has been canceled');
      planningMessage.status().contains('Canceled');

      planningMessage.cancelButton().should('not.exist');

      // Items frozen state indicated by spinner icon
      planningMessage.item(0).icon().should('have.class', 'icon-spinner');
      planningMessage.item(1).icon().should('have.class', 'icon-spinner');

      // Ensure that messages indicating the previous response was stopped are not visible
      cy.contains('You stopped the previous response').should('not.exist');
      cy.contains('The execution of the previous plan has been stopped').should('not.exist');
    });

    it('Execution stopped', () => {
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
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.cancel();

      planningMessage.header().contains('Plan execution has been canceled');
      planningMessage.status().contains('Canceled');

      planningMessage.cancelButton().should('not.exist');

      // Items frozen state indicated by spinner icon
      planningMessage.item(0).icon().should('have.class', 'icon-spinner');
      planningMessage.item(1).icon().should('have.class', 'icon-spinner');

      // Ensure that message indicating the previous plan was stopped is correctly displayed
      cy.contains('You stopped the previous response').should('not.exist');
      cy.contains('The execution of the previous plan has been stopped').should('exist');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });
  });

  describe('Planning message handling', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
      cy.clearLLMResponses();
      cy.clearLocalStorage('rancher-ai-ui*');
      cy.updateAiAssistantConfigs({
        PLAN_ENABLED:          'true',
        PLAN_APPROVAL_ENABLED: 'true'
      });
    });

    beforeEach(() => {
      cy.login();
      cy.cleanChatHistory();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('It should collapse and expand the status panel', () => {
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
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      let planningMessage = chat.getMessage(3).planning();

      // Planning message is expanded
      planningMessage.header().should('be.visible');
      planningMessage.header().should('contain', 'Awaiting approval to execute the following tasks');
      planningMessage.item(0).self().should('be.visible');
      planningMessage.item(1).self().should('be.visible');

      planningMessage.toggleCollapse();

      // Planning message is collapsed
      planningMessage.header().should('be.visible');
      planningMessage.header().should('contain', 'Awaiting approval to execute planned tasks');

      planningMessage.item(0).self().should('not.exist');
      planningMessage.item(1).self().should('not.exist');

      planningMessage.approve();

      planningMessage.header().should('contain', 'Executing: Create a new namespace');

      // Planning message is expanded again
      planningMessage.toggleCollapse();

      planningMessage.item(0).self().should('be.visible');
      planningMessage.item(1).self().should('be.visible');

      planningMessage.status().contains('Completed');

      chat.close();
      chat.open();

      chat.getMessage(4).checkExists();

      // When closing the chat, the planning should collapse
      planningMessage = chat.getMessage(3).planning();

      planningMessage.self().scrollIntoView();

      planningMessage.header().should('be.visible');
      planningMessage.item(0).self().should('not.exist');
      planningMessage.item(1).self().should('not.exist');
    });
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
    cy.clearLocalStorage('rancher-ai-ui*');
    cy.updateAiAssistantConfigs({
      PLAN_ENABLED:          'false',
      PLAN_APPROVAL_ENABLED: 'false'
    });
  });
});
