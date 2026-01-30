import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

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
    cy.multiAgentEnabled(true);
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

  it('It should correctly parse messages when agent selection is adaptive and default agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    cy.enqueueLLMResponse({
      agent:    defaultAgent.name,
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
      ],
      tool: {
        name: 'listKubernetesResources',
        args: {
          kind:      'Deployment',
          cluster:   'local',
          namespace: 'cattle-ai-agent-system'
        }
      },
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);

    cy.enqueueLLMResponse({
      agent:    defaultAgent.name,
      text:      'Pod created successfully.',
      tool:  {
        name: 'createKubernetesResource',
        args: {
          kind:      'Pod',
          name:      'my-pod',
          resource:  {},
          cluster:   'local',
          namespace: 'default'
        }
      },
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.containsText('Confirmed');
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);

    let resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);

    confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);

    resultMessage = chat.getMessage(6);

    resultMessage.scrollIntoView();
    resultMessage.containsText('Pod created successfully.');
    resultMessage.selectedAgentLabel(defaultAgent.name).contains(`${ defaultAgent.displayName } (Adaptive Mode)`);
  });

  it('It should correctly parse messages when agent selection is adaptive and custom agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    cy.enqueueLLMResponse({
      agent:    customAgent.name,
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
      ],
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.selectedAgentLabel(customAgent.name).contains(`${ customAgent.displayName } (Adaptive Mode)`);

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.selectedAgentLabel(customAgent.name).contains(`${ customAgent.displayName } (Adaptive Mode)`);
  });

  it('It should correctly parse messages when agent selection is manual and default agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(defaultAgent.name);

    item.select();

    selectAgent.self().contains(defaultAgent.displayName);

    cy.enqueueLLMResponse({
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
      ],
      tool: {
        name: 'listKubernetesResources',
        args: {
          kind:      'Deployment',
          cluster:   'local',
          namespace: 'cattle-ai-agent-system'
        }
      },
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    responseMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');

    cy.enqueueLLMResponse({
      text:      'Pod created successfully.',
      tool: {
        name: 'createKubernetesResource',
        args: {
          kind:      'Pod',
          name:      'my-pod',
          resource:  {},
          cluster:   'local',
          namespace: 'default'
        }
      },
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.containsText('Confirmed');
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');

    let resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    resultMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    responseMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');

    confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    confirmationRequestMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');

    resultMessage = chat.getMessage(6);

    resultMessage.scrollIntoView();
    resultMessage.containsText('Pod created successfully.');
    resultMessage.selectedAgentLabel(defaultAgent.name).contains(defaultAgent.displayName);
    resultMessage.selectedAgentLabel(defaultAgent.name).should('not.contain', '(Adaptive Mode)');
  });

  it('It should correctly parse messages when agent selection is manual and custom agent is selected', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);

    cy.enqueueLLMResponse({
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
      ],
      tool: {
        name: 'listKubernetesResources',
        args: {
          kind:      'Deployment',
          cluster:   'local',
          namespace: 'cattle-ai-agent-system'
        }
      },
    });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.selectedAgentLabel(customAgent.name).contains(customAgent.displayName);
    responseMessage.selectedAgentLabel(customAgent.name).should('not.contain', '(Adaptive Mode)');

    // Verify in history
    history.open();

    const chatItem = history.chatItem(0);

    chatItem.select();
    chat.isReady();

    responseMessage = chat.getMessage(3);

    responseMessage.scrollIntoView();
    responseMessage.selectedAgentLabel(customAgent.name).contains(customAgent.displayName);
    responseMessage.selectedAgentLabel(customAgent.name).should('not.contain', '(Adaptive Mode)');
  });

  it('It should correctly parse messages and the selected agent is no more available', () => {
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const item = selectAgent.agentItem(customAgent.name);

    item.select();

    selectAgent.self().contains(customAgent.displayName);
    cy.enqueueLLMResponse({ text: 'Response from agent.' });

    chat.sendMessage('Request message.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');

    let responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();
    responseMessage.selectedAgentLabel(customAgent.name).contains(customAgent.displayName);
    responseMessage.selectedAgentLabel(customAgent.name).should('not.contain', '(Adaptive Mode)');

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

    /**
     * The agent label should show Custom agent name
     * - the displayName is not available anymore since the agent config is deleted
     */
    responseMessage.selectedAgentLabel(customAgent.name).contains(customAgent.name);
    responseMessage.selectedAgentLabel(customAgent.name).should('not.contain', '(Adaptive Mode)');
  });

  after(() => {
    cy.multiAgentEnabled(false);
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});