import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

const longResponsePayload = {
  agentResponses: [{
    agent:   'rancher',
    mcpTool: {
      name: 'listKubernetesResources',
      args: {
        kind:      'Deployment',
        cluster:   'local',
        namespace: 'cattle-ai-agent-system'
      }
    },
  }],
  text: [
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' very very very very very very very very',
    ' long response',
  ],
  uiTools:   [
    {
      name: 'suggestions',
      args: {
        suggestion1: 'Show me the resources',
        suggestion2: 'The list of clusters',
        suggestion3: 'Another suggestion',
      }
    },
    {
      name: 'explore',
      args: {
        cluster: 'local',
        route:   'pods',
        label:   'View Pods',
      }
    },
    {
      name: 'explore',
      args: {
        route:   'nodes',
        label:   'View Nodes',
      }
    },
    {
      name: 'explore',
      args: {
        cluster: 'local',
        route:   'deployments',
        label:   'View Deployments',
      }
    },
    {
      name: 'show-yaml',
      args: {
        yaml:              'test',
        label:             'Show YAML',
        resourceKind:      'Deployment',
        resourceName:      'llm-mock',
        resourceNamespace: 'cattle-ai-agent-system',
      }
    }
  ]
};

describe('Console Actions', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should send a message when clicking the Send button', () => {
    cy.enqueueLLMResponse(longResponsePayload);

    chat.console().textarea().type('User request');
    chat.console().sendButton().click();

    const userMessage = chat.getMessage(2);

    userMessage.scrollIntoView();
    userMessage.containsText('User request');

    // Verify that the stop button appears and the send button disappears after sending a message
    chat.console().sendButton().should('not.exist');
    chat.console().stopButton().should('exist');

    const resultMessage = chat.getMessage(3);

    resultMessage.isCompleted();

    // Verify that the send button reappears and the stop button disappears after the message is completed
    chat.console().sendButton().should('exist');
    chat.console().stopButton().should('not.exist');
  });

  it('It should stop a message when clicking the Stop button', () => {
    cy.enqueueLLMResponse(longResponsePayload);

    chat.sendMessage('User request');

    const userMessage = chat.getMessage(2);

    userMessage.scrollIntoView();
    userMessage.containsText('User request');

    // Verify that the stop button appears and the send button disappears after sending a message
    chat.console().sendButton().should('not.exist');
    chat.console().stopButton().should('exist');

    const resultMessage = chat.getMessage(3);

    // Verify that the result message exists before attempting to stop it
    resultMessage.self().should('exist');

    chat.console().stopButton().click();

    // Verify that the send button reappears and the stop button disappears after stopping the message
    chat.console().sendButton().should('exist');
    chat.console().stopButton().should('not.exist');

    // Verify that the result message does not contain the full long response after stopping it
    resultMessage.self().should('contain.text', 'very');
    resultMessage.self().should('not.contain.text', 'long response');
    resultMessage.isCompleted();

    const stopNotificationMessage = chat.getMessage(4);

    // Verify that the stop notification message appears after stopping the message
    stopNotificationMessage.containsText('You stopped the previous response.');
  });

  it('It should stop a message when a new message is sent', () => {
    cy.enqueueLLMResponse(longResponsePayload);

    chat.sendMessage('User request');

    const userMessage = chat.getMessage(2);

    userMessage.scrollIntoView();
    userMessage.containsText('User request');

    const resultMessage = chat.getMessage(3);

    // Verify that the result message exists before attempting to send a new message
    resultMessage.self().should('exist');

    chat.sendMessage('New user request');

    // Verify that the result message does not contain the full long response after
    // sending a new message (which stops the previous one)
    resultMessage.self().should('contain.text', 'very');
    resultMessage.self().should('not.contain.text', 'long response');
    resultMessage.isCompleted();

    // Verify that the stop notification message does not appear as a separate message
    cy.contains('You stopped the previous response.').should('not.exist');

    // Verify that the conversation continues with the new user request
    const newUserMessage = chat.getMessage(4);

    newUserMessage.containsText('New user request');

    const newResultMessage = chat.getMessage(5);

    newResultMessage.self().should('exist');
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
  });
});
