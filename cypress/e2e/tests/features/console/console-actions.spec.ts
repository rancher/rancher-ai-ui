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
  });

  beforeEach(() => {
    cy.login();
    cy.clearLLMResponses();

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

  it('It should not send or stop a message when a response is pending', () => {
    cy.enqueueLLMResponse(longResponsePayload);

    chat.sendMessage('User request');

    const userMessage = chat.getMessage(2);

    userMessage.scrollIntoView();
    userMessage.containsText('User request');

    const resultMessage = chat.getMessage(3);

    // Verify that the result message starts appearing with partial content
    chat.console().sendButton().should('not.exist');
    chat.console().stopButton().should('exist');
    resultMessage.self().should('contain.text', 'very');
    resultMessage.self().should('not.contain.text', 'long response');

    // Type a new message and press Enter to attempt sending it while the previous response is still pending
    chat.sendMessage('New user request');

    // Verify that no new message has been sent while the previous response is still pending nor has the previous response completed
    resultMessage.self().should('not.contain.text', 'long response');
    chat.console().stopButton().should('exist');
    chat.console().sendButton().should('not.exist');
    chat.console().textarea().should('have.value', 'New user request');
    chat.getMessage(5).self().should('not.exist');

    // Verify that the result message has completed and the console buttons are in the expected state after the response is done
    resultMessage.isCompleted();
    resultMessage.self().should('contain.text', 'long response');
    chat.console().stopButton().should('not.exist');
    chat.console().sendButton().should('exist');
    chat.console().textarea().should('have.value', 'New user request');
    chat.getMessage(5).self().should('not.exist');
  });

  it('It should be possible to send a message when a planning is awaiting approval', () => {
    // Mock a planning to simulate awaiting approval condition
    const payload = JSON.stringify({
      tasks: [
        {
          task:   'Planning Task',
          agent:  'Agent 1',
          status: 'pending'
        },
        {
          task:   'Another Planning Task',
          agent:  'Agent 2',
          status: 'pending'
        }
      ],
      status:   'pending',
      approval: true
    });

    cy.enqueueLLMResponse({ text: `<plan>${ payload }</plan>` });

    chat.sendMessage('User request');

    const planningMessage = chat.getMessage(3).planning();

    planningMessage.header().contains('Awaiting approval to execute the following tasks');
    planningMessage.item(1).self().contains('Another Planning Task');

    chat.sendMessage('Another long long long long long long long long long long long long long long long long long user request');

    chat.getMessage(4).self().should('contain.text', 'user request');
  });

  it('It should not send a message when a planning is executing', () => {
    // Mock a planning to simulate executing condition
    const payload = JSON.stringify({
      tasks: [
        {
          task:   'Planning Task',
          agent:  'Agent 1',
          status: 'in_progress'
        },
        {
          task:   'Another Planning Task',
          agent:  'Agent 2',
          status: 'pending'
        }
      ],
      status:   'in_progress',
      approval: false
    });

    cy.enqueueLLMResponse({ text: `<plan>${ payload }</plan>` });

    chat.sendMessage('User request');

    const planningMessage = chat.getMessage(3).planning();

    planningMessage.header().contains('Using 2 agents to execute the following tasks');
    planningMessage.item(1).self().contains('Another Planning Task');

    chat.sendMessage('Another long long long long long long long long long long long long long long long long long user request');

    chat.getMessage(4).self().should('not.exist');
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
  });
});
