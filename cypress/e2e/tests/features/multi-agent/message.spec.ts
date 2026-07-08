import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import { harvesterAgentConfig } from '@/cypress/e2e/blueprints/aiAgentConfigs';

describe('Multi Agent Messages', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

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

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should correctly parse messages when agent selection is adaptive and default agent responds', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   defaultAgent.name,
        mcpTool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Deployment',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
      }],
      text:  [
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ]
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   defaultAgent.name,
        mcpTool:  {
          name: 'createKubernetesResource',
          args: {
            kind:      'Pod',
            name:      'my-pod-2',
            resource:  {
              apiVersion: 'v1',
              kind:       'Pod',
              metadata:   {
                name:      'my-pod-2',
                namespace: 'default'
              },
              spec: {
                containers: [{
                  name:  'my-container',
                  image: 'nginx'
                }]
              }
            },
            cluster:   'local',
            namespace: 'default'
          }
        },
      }],
      text: 'Pod created successfully.'
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();

    confirmationRequestMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
    confirmationRequestMessage.resourceButton({ name: 'my-pod-2' }).should('exist');
    confirmationRequestMessage.isConfirmed();

    let resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    resultMessage = chat.getMessage(6);

    resultMessage.scrollIntoView();
    resultMessage.containsText('Pod created successfully.');
    resultMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
    resultMessage.resourceButton({ name: 'my-pod-2' }).should('exist');
  });

  it('It should correctly parse messages when agent selection is adaptive and multiple agents respond', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   defaultAgent.name,
        mcpTool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Deployment',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
      }, {
        agent:   defaultAgent.name,
        mcpTool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Pod',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
      }],
      text:  [
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ]
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    const responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    // Verify first agent response
    const deployments = [
      'llm-mock',
      'rancher-ai-agent',
      'rancher-mcp-server',
    ];

    deployments.forEach((name) => {
      const btn = responseMessage.resourceButton({ name });

      btn.should('exist');
    });

    // Verify second agent response
    const podPrefixes = [
      'llm-mock-',
      'rancher-ai-agent-',
      'rancher-mcp-server-',
    ];

    podPrefixes.forEach((prefix) => {
      const btn = responseMessage.resourceButton({ prefix });

      btn.should('exist');
    });

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    const historyResponseMessage = chat.getMessage(3);

    historyResponseMessage.scrollIntoView();
    historyResponseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    // Verify first agent response in history
    deployments.forEach((name) => {
      const btn = historyResponseMessage.resourceButton({ name });

      btn.should('exist');
    });

    // Verify second agent response in history
    podPrefixes.forEach((prefix) => {
      const btn = historyResponseMessage.resourceButton({ prefix });

      btn.should('exist');
    });
  });

  it('It should correctly parse messages when agent selection is adaptive and custom agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{ agent: customAgent.name }],
      text:           [
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ]
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
  });

  it('It should correctly parse messages when agent selection is manual and default agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(defaultAgent.name);

    item.select();

    selectAgent.self().contains(defaultAgent.displayName);

    cy.enqueueLLMResponse({
      agentResponses: [{
        mcpTool: {
          name: 'createKubernetesResource',
          args: {
            kind:      'Pod',
            name:      'my-pod',
            resource:  {
              apiVersion: 'v1',
              kind:       'Pod',
              metadata:   {
                name:      'my-pod',
                namespace: 'default'
              },
              spec: {
                containers: [{
                  name:  'my-container',
                  image: 'nginx'
                }]
              }
            },
            cluster:   'local',
            namespace: 'default'
          }
        },
      }],
      text: 'Pod created successfully.'
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');

    chat.messagesPanel().processingState('Awaiting confirmation').should('be.visible');

    confirmationRequestMessage.confirmButton().click();

    confirmationRequestMessage.agentSelectionLabel().contains(defaultAgent.displayName);
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.resourceButton({ name: 'my-pod' }).should('exist');

    let resultMessage = chat.getMessage(4);

    resultMessage.isCompleted();
    resultMessage.containsText('Pod created successfully.');
    resultMessage.agentSelectionLabel().contains(defaultAgent.displayName);

    cy.enqueueLLMResponse({
      agentResponses: [{
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
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ]
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(5);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(6);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains(defaultAgent.displayName);

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.agentSelectionLabel().contains(defaultAgent.displayName);

    confirmationRequestMessage.confirmationStatus().scrollIntoView();
    confirmationRequestMessage.isConfirmed();

    resultMessage = chat.getMessage(4);

    resultMessage.scrollIntoView();
    resultMessage.agentSelectionLabel().contains(defaultAgent.displayName);
    resultMessage.containsText('Pod created successfully.');
    resultMessage.resourceButton({ name: 'my-pod' }).should('exist');

    responseMessage = chat.getMessage(6);

    responseMessage.scrollIntoView();
    responseMessage.agentSelectionLabel().contains(defaultAgent.displayName);
  });

  it('It should correctly parse messages when agent selection is manual and custom agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({
      agentResponses: [{
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
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ]
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains(customAgent.displayName);

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.agentSelectionLabel().contains(customAgent.displayName);
  });

  it('It should correctly parse messages for which the selected agent is no longer available', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent(s) Selection');

    cy.enqueueLLMResponse({
      agentResponses: [{ agent: customAgent.name }],
      text:           'Response from agent.'
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');

    chat.close();

    // Delete Custom agent
    cy.deleteRancherResource('v1', 'ai.cattle.io.aiagentconfig', `cattle-ai-agent-system/${ customAgent.name }`, false);

    // Refresh the UI window
    cy.login();
    HomePagePo.goTo();

    chat.open();

    // Only default agent should be available now - multi-agent is disabled
    chat.console().selectAgent().self().should('not.exist');

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(2);

    responseMessage.scrollIntoView();

    responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
  });

  after(() => {
    cy.login();

    cy.deleteRancherResource('v1', 'pods', 'default/my-pod', false);
    cy.deleteRancherResource('v1', 'pods', 'default/my-pod-2', false);

    cy.deleteAgentConfig(harvesterAgentConfig);
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});