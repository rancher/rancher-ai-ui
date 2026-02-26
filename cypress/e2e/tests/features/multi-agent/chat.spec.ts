import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import { rancherAgentConfig, harvesterAgentConfig, invalidAgentConfig } from '@/cypress/e2e/blueprints/aiAgentConfigs';

describe('Multi Agent Chat', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  before(() => {
    cy.login();
    // Create a custom agent config to enable multi-agent switching
    cy.createAgentConfig(harvesterAgentConfig);
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should be possible to switch agents manually', () => {
    chat.console().selectAgent().checkExists();

    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const item = selectAgent.agentItem('harvester');

    item.select();
    item.checkNotExists();

    selectAgent.self().contains('Harvester');

    selectAgent.open();

    const harvesterAgent = selectAgent.agentItem('harvester');

    harvesterAgent.checkSelected();
  });

  it('It should be possible to switch agent selection mode from a system recommendation message', () => {
    // Sending 5 messages to trigger a system recommendation to switch agent selection mode
    for (let i = 0; i < 5; i++) {
      chat.sendMessage(`Request ${ i + 1 }`);

      const responseMessage = chat.getMessage(3 + (i * 2));

      responseMessage.isCompleted();
    }

    // Confirm the mode switch from the system message
    const switchAgentMessage = chat.getMessage(12);

    switchAgentMessage.confirmButton().click();

    switchAgentMessage.isConfirmed();

    // Verify that the selection mode has been switched in the console
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().should('not.contain', 'Adaptive Agent Selection');

    // Verify that the selection mode is reflected in the next messages
    chat.sendMessage('Check current agent');

    const responseMessage = chat.getMessage(14);

    responseMessage.scrollIntoView();
    responseMessage.containsText('Rancher');
    responseMessage.self().should('not.contain', '(Adaptive Mode)');
  });

  it('It should be possible to dismiss agent switch from a system recommendation message', () => {
    // Sending 5 messages to trigger a system recommendation to switch agent selection mode
    for (let i = 0; i < 5; i++) {
      chat.sendMessage(`Request ${ i + 1 }`);

      const responseMessage = chat.getMessage(3 + (i * 2));

      responseMessage.isCompleted();
    }

    // Dismiss the mode switch from the system message
    const switchAgentMessage = chat.getMessage(12);

    switchAgentMessage.cancelButton().click();

    switchAgentMessage.isCanceled();

    // Verify that the selection mode is still adaptive in the console
    const selectAgent = chat.console().selectAgent();

    selectAgent.self().contains('Adaptive Agent Selection');

    // Verify that the switch message is not shown again in the next messages
    history.open();
    history.createChat();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    for (let i = 0; i < 6; i++) {
      chat.sendMessage(`Request ${ i + 1 }`);

      const responseMessage = chat.getMessage(3 + (i * 2));

      responseMessage.isCompleted();
    }

    // Verify that no switch message is shown
    chat.getMessage(14).checkNotExists();
  });

  it('It should show invalid agents in the agent switcher', () => {
    cy.createAgentConfig(invalidAgentConfig);

    chat.console().selectAgent().checkExists();

    const selectAgent = chat.console().selectAgent();

    selectAgent.open();

    const item = selectAgent.agentItem(invalidAgentConfig.metadata.name);

    item.isDisabled();

    cy.deleteAgentConfig(invalidAgentConfig);
  });

  it('It should not show the adaptive agent selection when only one agent is enabled and active', () => {
    cy.updateAgentConfig({
      ...harvesterAgentConfig,
      spec: { mcpURL: 'invalid-mcp' }
    });

    chat.console().selectAgent().checkExists();

    const selectAgent = chat.console().selectAgent();

    selectAgent.open();

    // Verify that the adaptive agent selection option is not shown when only one agent is available (Rancher)
    selectAgent.self().should('not.contain', 'Adaptive Agent Selection');

    // Verify that the only available agent is the rancher agent and it is selected
    const harvesterAgent = selectAgent.agentItem('rancher');

    harvesterAgent.checkSelected();

    // Restore the harvester agent config to have 2 active agents
    cy.updateAgentConfig(harvesterAgentConfig);

    // Verify that the adaptive agent selection option is shown again and is selected by default
    selectAgent.self().contains('Adaptive Agent Selection');

    selectAgent.open();

    const adaptiveOption = selectAgent.agentItem('__adaptive__');

    adaptiveOption.checkSelected();
  });

  it('It should show an error message if all enabled agents are not available', () => {
    // Delete custom agent
    cy.deleteAgentConfig(harvesterAgentConfig);

    // Replace mcpURL with an invalid one in the default agent config to make it unavailable
    cy.updateAgentConfig({
      ...rancherAgentConfig,
      spec: { mcpURL: 'invalid-mcp' }
    });

    // Check for the error message in the chat panel
    cy.login();

    HomePagePo.goTo();

    chat.open();

    chat.getErrorMessage(1).containsText('Failed to load MCP tools for all enabled agents.');
    chat.getErrorMessage(1).containsText('Please check the AI Agents configuration and ensure the MCP server is accessible with the provided connection details.');
  });

  after(() => {
    cy.deleteAgentConfig(invalidAgentConfig);
    cy.deleteAgentConfig(harvesterAgentConfig);
    cy.updateAgentConfig(rancherAgentConfig);
    cy.cleanChatHistory();
  });
});