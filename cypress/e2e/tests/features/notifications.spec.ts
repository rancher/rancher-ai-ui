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

    const MockNotification = function(title: string, options: any) {
      lastInstance = {
        title,
        options,
        close:   cy.stub(),
        onclick: null,
        onclose: null
      };

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

    it('It should correctly handle the notification indicator on the Liz button when Notifications are enabled', () => {
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

    it('It should not show a notification indicator when Notifications are disabled', () => {
      setupWebSocketStub();

      chatMenu.toggleMenu();

      chatMenu.clickOption('Disable Notifications');

      const systemMessage = chat.getMessage(2);

      systemMessage.containsText('Notifications are now turned OFF');

      chat.sendMessage('Request');

      chat.getMessage(3).containsText('Request');

      chat.close();

      // Trigger message completion via WebSocket stub
      cy.window().then((win) => {
        (win as any).__triggerMessageCompletion();
      });

      cy.wait(500);

      RancherHeaderPo.lizNotificationIndicator().should('not.exist');

      chat.open();

      RancherHeaderPo.lizNotificationIndicator().should('not.exist');
    });

    afterEach(() => {
      cy.login();

      cy.clearLocalStorage('rancher-ai-ui*');
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

      chatMenu.clickOption('Disable Notifications');

      const systemMessage = chat.getMessage(2);

      systemMessage.containsText('Notifications are now turned OFF');

      chat.sendMessage('Request');

      chat.getMessage(3).containsText('Request');

      chat.getMessage(4).isCompleted();

      // Verify that the desktop notification was NOT triggered
      cy.window().then((win) => {
        const notificationInstance = (win as any).__notificationInstance;

        expect(notificationInstance).to.be.null;
      });
    });

    afterEach(() => {
      cy.login();

      cy.clearLocalStorage('rancher-ai-ui*');
    });
  });

  after(() => {
    cy.login();

    cy.clearLLMResponses();
    cy.cleanChatHistory();
  });
});
