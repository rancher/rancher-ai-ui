import { McpAuthenticationResponse } from '../../../../../pkg/rancher-ai-ui/types';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { harvesterAgentConfig } from '@/cypress/e2e/blueprints/aiAgentConfigs';

const OAUTH2_CHANNEL_NAME = 'oauth_channel';
const OAUTH2_SUCCESS_MESSAGE = 'oauth_success';

/**
 * Stubs the OAuth2 popup behavior for testing purposes.
 *
 * if result is 'success'
 *   it simulates a successful OAuth2 authentication
 *   by sending a message to the BroadcastChannel after a short delay.
 *
 * if result is 'failure'
 *   it simulates a failed OAuth2 authentication (no message sent to the BroadcastChannel)
 *   and the popup is closed after a short delay.
 *
 * if result is 'idle'
 *   it returns a stubbed popup, on which no action is taken.
 *
 * @param result - The result of the OAuth2 authentication ('success', 'failure', or 'idle').
 */
function stubOauth2Popup(result: 'success' | 'failure' | 'idle') {
  cy.window().then((win) => {
    if (result === 'idle') {
      cy.stub(win, 'open').as('popupStub');

      return;
    }

    cy.stub(win, 'open').as('popupStub').callsFake(() => {
      if (result === 'success') {
        setTimeout(() => {
          const channel = new BroadcastChannel(OAUTH2_CHANNEL_NAME);

          channel.postMessage({ type: OAUTH2_SUCCESS_MESSAGE });
          channel.close();
        }, 200);
      }

      const mockPopup = { closed: false };

      setTimeout(() => {
        mockPopup.closed = true;
      }, 500);

      return mockPopup;
    });
  });
}

/**
 * Stubs the WebSocket send method to intercept messages sent by the main UI.
 * This allows us to verify that the correct messages are sent after OAuth2 authentication.
 *
 * IMPORTANT:
 *   This function should be called before chat opening to ensure that the WebSocket is stubbed
 *   before the WebSocket connection is established.
 */
function stubWebSocketSend() {
  cy.window().then((win) => {
    const OriginalWebSocket = win.WebSocket;

    cy.stub(win, 'WebSocket').callsFake((url, protocols) => {
      const wsInstance = new OriginalWebSocket(url, protocols);

      cy.spy(wsInstance, 'send').as('wsSend');

      return wsInstance;
    });
  });
}

describe('Multi Agent OAuth2 Authentication', () => {
  const chat = new ChatPo();

  const defaultAgent = {
    name:        'rancher',
    displayName: 'Rancher',
    description: 'Rancher built-in agent',
  };

  const customAgent = {
    name:        'harvester',
    displayName: 'Harvester',
    description: 'Harvester custom agent',
  };

  const popupUrl = 'https://suse.com';
  const oauth2Response = `<authentication>{"type": "oauth2", "url": "${ popupUrl }", "agent": "${ defaultAgent.name }"}</authentication>`;

  before(() => {
    cy.login();
    // Create a custom agent config to enable multi-agent switching
    cy.createAgentConfig(harvesterAgentConfig);
    cy.cleanChatHistory();
  });

  beforeEach(() => {
    cy.login();
    cy.clearLLMResponses();

    HomePagePo.goTo();

    stubWebSocketSend();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should confirm authentication request with success when agent selection is manual', () => {
    stubOauth2Popup('success');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    // Verify that the WebSocket send method was called with the expected message after receving the OAuth2 success message from the popup
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Continue);
  });

  it('It should confirm authentication request with failure when agent selection is manual', () => {
    stubOauth2Popup('failure');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    // Verify that the WebSocket send method was called with the expected message after the popup is closed without sending the OAuth2 success message
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Cancel);
  });

  it('It should cancel authentication request when agent selection is manual', () => {
    stubOauth2Popup('idle');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.cancelButton().click();

    authRequestMessage.isCanceled();

    // Verify that the popup was not opened
    cy.get('@popupStub').should('not.be.called');

    // Verify that the WebSocket send method was called with the expected message after cancel is clicked
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Cancel);
  });

  it('It should confirm authentication request with success when agent selection is adaptive', () => {
    stubOauth2Popup('success');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{ agent: defaultAgent.name }],
      text:           oauth2Response
    });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    // Verify that the WebSocket send method was called with the expected message after receving the OAuth2 success message from the popup
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Continue);
  });

  it('It should confirm authentication request with failure when agent selection is adaptive', () => {
    stubOauth2Popup('failure');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{ agent: defaultAgent.name }],
      text:           oauth2Response
    });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    // Verify that the WebSocket send method was called with the expected message after the popup is closed without sending the OAuth2 success message
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Cancel);
  });

  it('It should cancel authentication request when agent selection is adaptive', () => {
    stubOauth2Popup('idle');

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.cancelButton().click();

    authRequestMessage.isCanceled();

    // Verify that the popup was not opened
    cy.get('@popupStub').should('not.be.called');

    // Verify that the WebSocket send method was called with the expected message after cancel is clicked
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Cancel);
  });

  it('It should abort pending authentication requests when closing the chat panel', () => {
    stubOauth2Popup('success');

    const selectAgent = chat.console().selectAgent();

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    chat.close();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    // Verify that the WebSocket send method was called with the expected message after the popup is closed without sending the OAuth2 success message
    cy.get('@wsSend').should('be.calledWithMatch', McpAuthenticationResponse.Cancel);
  });

  it('It should abort pending authentication requests when connection is lost', () => {
    stubOauth2Popup('success');

    const selectAgent = chat.console().selectAgent();

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({ text: oauth2Response });

    chat.sendMessage('Request message.');

    const authRequestMessage = chat.getMessage(4);

    authRequestMessage.agentSelectionLabel().contains(`Agent: ${ defaultAgent.displayName }`);
    authRequestMessage.containsText('The tool you have selected requires authentication');

    authRequestMessage.confirmButton().click();

    authRequestMessage.isConfirmed();

    // Simulate connection loss re-installing the Rancher AI service
    cy.installRancherAIService();

    // Verify that the popup was opened
    cy.get('@popupStub').should('be.calledOnce');
    cy.get('@popupStub').should('be.calledWithMatch', popupUrl);

    cy.get('@wsSend').should('not.be.called');
  });

  after(() => {
    cy.deleteAgentConfig(harvesterAgentConfig);
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});