/* eslint-disable @typescript-eslint/no-unused-expressions */
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import ChatPanelMenuPo from '@/cypress/e2e/po/chat-panel-menu.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import DesktopNotificationsInfoPo from '@/cypress/e2e/po/desktop-notifications-info.po';

const USER_AGENTS = {
  edge:    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  chrome:  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

/**
 * Simulate a browser that has not asked for the notifications permission yet
 */
function setupPendingPermission(userAgent: string) {
  cy.window().then((win) => {
    const MockNotification = function() {} as any;

    MockNotification.permission = 'default';
    MockNotification.requestPermission = cy.stub().as('requestPermission').callsFake(() => {
      MockNotification.permission = 'granted';

      return Promise.resolve('granted');
    });
    win.Notification = MockNotification;

    Object.defineProperty(win.navigator, 'userAgent', { get: () => userAgent });
  });
}

/**
 * Mock the Notification API and document.hasFocus()
 * Stores references in window for test assertions
 */
function setupDesktopNotificationMock() {
  cy.window().then((win) => {
    // Mock Notification API
    // Track the last instance created
    let lastInstance: any = null;
    const bodies: string[] = [];

    const MockNotification = function(title: string, options: any) {
      lastInstance = {
        title,
        options,
        close:   cy.stub(),
        onclick: null,
        onclose: null
      };
      bodies.push(options.body);

      return lastInstance;
    };

    MockNotification.permission = 'granted';
    MockNotification.requestPermission = cy.stub().resolves('granted');
    win.Notification = MockNotification as any;

    // Expose the last instance for assertions
    Object.defineProperty(win as any, '__notificationInstance', {
      get() {
        return lastInstance;
      }
    });
    Object.defineProperty(win as any, '__notificationBodies', { value: bodies });

    // Mock document.hasFocus() to return false so notifications are always sent
    cy.stub(win.document, 'hasFocus').returns(false);
  });
}

/**
 * Deliver the given data to the chat as if it came from the agent, through the chat's open socket
 */
function receiveFromAgent(chunks: string[]) {
  cy.window().then(async(win: any) => {
    const ws = win.$globalApp.$store.getters['rancher-ai-ui/connection/ws'];

    for (const data of chunks) {
      await ws.onmessage(new MessageEvent('message', { data }));
    }
  });
}

describe('Chat', () => {
  const chat = new ChatPo();
  const chatMenu = new ChatPanelMenuPo();

  // A one-task plan event, as the planner agent streams it
  const plan = (status: string, approval = false) => `<plan>${ JSON.stringify({
    status,
    approval,
    tasks: [{
      task:   'Create a namespace',
      agent:  'rancher',
      status: status === 'pending' ? 'pending' : 'in_progress'
    }]
  }) }</plan>`;

  describe('UI notifications', () => {
    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
      chat.isReady();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('It should show notification indicator on the Liz button', () => {
      chat.close();

      receiveFromAgent(['<message>', 'Response', '</message>']);

      RancherHeaderPo.lizNotificationIndicator().should('exist');

      chat.open();

      // The notification indicator should disappear once the chat is opened
      RancherHeaderPo.lizNotificationIndicator().should('not.exist');
    });
  });

  describe('Desktop notifications', () => {
    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
      chat.isReady();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('It should correctly generate desktop notifications when Notifications are enabled', () => {
      setupDesktopNotificationMock();

      chat.sendMessage('Request');

      chat.getMessage(2).containsText('Request');

      chat.getMessage(3).isCompleted();

      // Verify that the desktop notification was triggered
      cy.window().then((win) => {
        const notificationInstance = (win as any).__notificationInstance;

        expect(notificationInstance).to.exist;
        expect(notificationInstance.title).to.include('AI Assistant');
        expect(notificationInstance.options.body).to.exist;
        expect(notificationInstance.options.tag).to.include('rancher-ai-ui');
      });
    });

    it('It should not generate desktop notifications when Notifications are disabled', () => {
      setupDesktopNotificationMock();

      chatMenu.toggleMenu();

      chatMenu.clickOption('Disable Desktop Notifications');

      const systemMessage = chat.getMessage(2);

      systemMessage.containsText('Desktop Notifications are now turned OFF');

      chat.sendMessage('Request');

      chat.getMessage(3).containsText('Request');

      chat.getMessage(4).isCompleted();

      // Verify that the desktop notification was NOT triggered
      cy.window().then((win) => {
        const notificationInstance = (win as any).__notificationInstance;

        expect(notificationInstance).to.be.null;
      });
    });

    it('It should notify an error when it happens', () => {
      setupDesktopNotificationMock();

      receiveFromAgent(['<message>', '<error>{"message":"Something went wrong"}</error>', '</message>']);

      chat.getMessage(3).containsText('Something went wrong');

      cy.window().its('__notificationBodies').should('deep.equal', ['Response failed']);
    });

    it('It should notify a pending confirmation', () => {
      setupDesktopNotificationMock();

      cy.clearLLMResponses();
      cy.enqueueLLMResponse({
        agentResponses: [{
          agent:   'rancher',
          mcpTool: {
            name: 'createKubernetesResource',
            args: {
              kind:      'Pod',
              name:      'my-pod',
              manifest:  `{
                apiVersion: 'v1',
                kind:       'Pod',
                metadata:   {
                  name:      'my-pod',
                  namespace: 'default'
                },
                spec:       {
                  containers: [{
                    name:  'my-container',
                    image: 'nginx:latest'
                  }]
                }
              }`,
              cluster:   'local',
              namespace: 'default'
            }
          },
        }],
        text: 'Pod created successfully.'
      });

      chat.sendMessage('Create a pod named my-pod in default namespace');

      const confirmationMessage = chat.getMessage(3);

      confirmationMessage.containsText('Are you sure you want to proceed with this action?');

      cy.window().its('__notificationBodies').should('deep.equal', ['Waiting for your confirmation']);

      confirmationMessage.cancelButton().click();
      confirmationMessage.isCanceled();
    });

    it('It should notify an MCP sign-in request', () => {
      setupDesktopNotificationMock();

      cy.clearLLMResponses();
      cy.enqueueLLMResponse({ text: '<authentication>{"type": "oauth2", "url": "https://suse.com", "agent": "rancher"}</authentication>' });

      chat.sendMessage('Request message.');

      const authRequestMessage = chat.getMessage(4);

      authRequestMessage.containsText('The tool you have selected requires authentication');

      cy.window().its('__notificationBodies').should('include', 'Sign-in required to continue');

      authRequestMessage.cancelButton().click();
      authRequestMessage.isCanceled();
    });

    afterEach(() => {
      cy.login();

      cy.clearLocalStorage('rancher-ai-ui*');
    });
  });

  describe('Desktop notifications permission', () => {
    const info = new DesktopNotificationsInfoPo();

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();
    });

    it('It should inform the user before asking for the permission', () => {
      setupPendingPermission(USER_AGENTS.edge);

      chat.open();
      chat.getMessage(1).isCompleted();

      info.self().should('be.visible').and('contain.text', 'Desktop Notifications are ON');
      info.settingsHint().should('contain.text', 'check the notification settings of your browser');

      info.allow();

      cy.get('@requestPermission').should('have.been.calledOnce');
      info.checkNotExists();
    });

    it('It should turn the notifications off from the message', () => {
      setupPendingPermission(USER_AGENTS.firefox);

      chat.open();
      chat.getMessage(1).isCompleted();

      info.settingsHint().should('not.exist');

      info.turnOff();

      cy.get('@requestPermission').should('not.have.been.called');
      info.checkNotExists();

      chatMenu.toggleMenu();
      chatMenu.option('Enable Desktop Notifications').should('exist');
    });

    it('It should not show the message again after enabling the notifications from the menu', () => {
      setupPendingPermission(USER_AGENTS.firefox);

      // The user dismisses the browser prompt: the permission stays pending
      cy.window().then((win: any) => {
        win.Notification.requestPermission = cy.stub().as('requestPermission').resolves('default');
      });

      chat.open();
      chat.getMessage(1).isCompleted();

      chatMenu.toggleMenu();
      chatMenu.clickOption('Disable Desktop Notifications');
      info.checkNotExists();

      chatMenu.toggleMenu();
      chatMenu.clickOption('Enable Desktop Notifications');

      cy.get('@requestPermission').should('have.been.calledOnce');

      chat.close();
      chat.open();
      chat.getMessage(1).isCompleted();

      info.checkNotExists();
    });

    it('It should show the message on Chrome, without the browser settings hint', () => {
      setupPendingPermission(USER_AGENTS.chrome);

      chat.open();
      chat.getMessage(1).isCompleted();

      info.self().should('be.visible');
      info.settingsHint().should('not.exist');
    });

    afterEach(() => {
      cy.login();

      cy.clearLocalStorage('rancher-ai-ui*');
    });
  });

  describe('Desktop notifications for planning', () => {
    const tasks = [
      {
        summary: 'Create a new namespace in the cluster \'local\'.',
        agent:   'rancher',
        result:  {
          status:  'completed' as const,
          message: 'Namespace created'
        }
      },
      {
        summary: 'Create a pod inside the newly created namespace in cluster \'local\'.',
        agent:   'fleet',
        result:  {
          status:  'completed' as const,
          message: 'Pod created'
        }
      }
    ];

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
      chat.isReady();

      chat.getMessage(1).isCompleted();
    });

    it('It should notify the plan approval and its completion', () => {
      setupDesktopNotificationMock();

      cy.enqueuePlanningResponse(tasks);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      cy.window().its('__notificationBodies').should('deep.equal', ['Planning message ready: 2 tasks']);

      planningMessage.approve();

      planningMessage.status().contains('Completed');

      cy.window().its('__notificationBodies').should('include', 'Plan completed');
    });

    it('It should notify a failed plan', () => {
      setupDesktopNotificationMock();

      cy.enqueuePlanningResponse([
        tasks[0],
        {
          ...tasks[1],
          result: {
            status:  'failed',
            message: 'Failed to create Pod'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.approve();

      planningMessage.header().contains('Plan execution has been stopped');

      cy.window().its('__notificationBodies').should('include', 'Plan failed');
    });

    it('It should notify a plan step that fails', () => {
      setupDesktopNotificationMock();

      receiveFromAgent([
        '<message>', plan('pending', true), '</message>',
        '<message>', plan('in_progress'), '<error>{"message":"Something went wrong"}</error>', '</message>'
      ]);

      cy.window().its('__notificationBodies').should('deep.equal', ['Planning message ready: 1 tasks', 'Response failed']);
    });

    it('It should notify a plan step waiting for confirmation', () => {
      setupDesktopNotificationMock();

      const confirmation = JSON.stringify({
        type: 'external',
        name: 'externalTool',
        args: { id: 'my-id' }
      });

      receiveFromAgent([
        '<message>', plan('pending', true), '</message>',
        '<message>', plan('in_progress'), 'Step result', '</message>',
        '<message>', `<confirmation-response>${ confirmation }</confirmation-response>`, '</message>'
      ]);

      cy.window().its('__notificationBodies').should('include', 'Waiting for your confirmation');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });

    after(() => {
      cy.login();
      cy.clearLocalStorage('rancher-ai-ui*');
      cy.updateAiAssistantConfigs({
        PLAN_ENABLED:          'false',
        PLAN_APPROVAL_ENABLED: 'false'
      });
    });
  });

  after(() => {
    cy.login();

    cy.clearLLMResponses();
    cy.cleanChatHistory();
  });
});
