/* eslint-disable @typescript-eslint/no-unused-expressions */
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import ChatPanelMenuPo from '@/cypress/e2e/po/chat-panel-menu.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';

/**
 * Mock the Notification API and document.hasFocus()
 * Stores references in window for test assertions
 */
function setupDesktopNotificationMock() {
  cy.window().then((win) => {
    // Mock Notification API
    const OriginalNotification = win.Notification;

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

    MockNotification.permission = OriginalNotification.permission || 'granted';
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
 * Stub WebSocket to intercept and control message completion
 */
function setupWebSocketStub() {
  cy.window().then((win) => {
    const OriginalWebSocket = win.WebSocket;
    const sockets: any[] = [];

    class WebSocketStub extends OriginalWebSocket {
      url: string;

      constructor(url: string) {
        super(url);
        this.url = url;
        sockets.push(this);
      }
    }

    // Expose method to trigger completion only on /v1/ws/messages socket
    Object.defineProperty(win as any, '__triggerMessageCompletion', {
      value: () => {
        const messagesSocket = sockets.find((socket) => socket.url.includes('/v1/ws/messages'));

        if (messagesSocket && messagesSocket.onmessage) {
          messagesSocket.onmessage(new MessageEvent('message', { data: '</message>' }));
        }
      }
    });

    win.WebSocket = WebSocketStub as any;
  });
}

describe('Chat', () => {
  const chat = new ChatPo();
  const chatMenu = new ChatPanelMenuPo();

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
      setupWebSocketStub();

      chat.sendMessage('Request');

      chat.getMessage(2).containsText('Request');

      chat.close();

      // Trigger message completion via WebSocket stub
      cy.window().then((win) => {
        (win as any).__triggerMessageCompletion();
      });

      // Wait for the notification indicator to appear
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

      cy.window().then(async(win: any) => {
        const ws = win.$globalApp.$store.getters['rancher-ai-ui/connection/ws'];

        for (const data of ['<message>', '<error>{"message":"Something went wrong"}</error>', '</message>']) {
          await ws.onmessage(new MessageEvent('message', { data }));
        }
      });

      chat.getMessage(3).containsText('Something went wrong');

      cy.window().its('__notificationBodies').should('include', 'Response failed');
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
