import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

describe('Message Planning', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  before(() => {
    cy.login();
  });

  describe('Planning without approval', () => {
    before(() => {
      cy.login();
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

    it('It should properly parse successful planning execution from history chats', () => {
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

      planningMessage.header().contains('All tasks have been completed');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');
    });

    it('It should properly parse failed planning execution from history chats', () => {
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

      planningMessage.header().contains('Plan execution has been stopped');

      planningMessage.item(1).icon().should('have.class', 'icon-error');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');
      historyResponseMessage.containsText('The agent did not complete the task');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });
  });

  describe('Planning with approval', () => {
    before(() => {
      cy.login();
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

    it('It should properly parse successful planning execution from history chats', () => {
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

      planningMessage.approve();

      planningMessage.status().contains('Completed');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');
    });

    it('It should properly parse failed planning execution from history chats', () => {
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

      planningMessage.approve();

      planningMessage.status().contains('Execution failed');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');
      historyResponseMessage.containsText('The agent did not complete the task');
    });

    it('It should properly parse canceled planning execution from history chats', () => {
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

      planningMessage.cancel();

      planningMessage.status().contains('Canceled');

      planningMessage.cancelButton().should('not.exist');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');
      historyResponseMessage.containsText('Plan was not approved');
    });

    it('It should properly parse stopped planning execution from history chats', () => {
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

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.cancel();

      planningMessage.status().contains('Canceled');

      // Create a new chat to trigger the history population
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Now open history and select the previous chat
      history.open();
      history.chatItem(0).select();
      chat.isReady();

      const userMessage = chat.getMessage(1);

      userMessage.scrollIntoView();
      userMessage.containsText('Create a namespace and a Pod in it');

      const historyResponseMessage = chat.getMessage(2);

      // Verify response message is visible
      historyResponseMessage.scrollIntoView();
      historyResponseMessage.self().should('be.visible');

      // Sometimes the first task succeeds before cancellation is fully processed, so we can have 2 messages
      // We check the last one to be the cancel message notification
      chat.getMessages().last().contains('The execution of the previous plan has been stopped');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });
  });

  after(() => {
    cy.clearLLMResponses();
    cy.updateAiAssistantConfigs({
      PLAN_ENABLED:          'false',
      PLAN_APPROVAL_ENABLED: 'false'
    });
  });
});
