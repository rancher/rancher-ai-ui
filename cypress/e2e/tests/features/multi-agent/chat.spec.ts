import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import { SettingsPagePo as GlobalSettings } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import {
  fleetAgentConfig, provisioningAgentConfig, harvesterAgentConfig, invalidAgentConfig, rancherAgentConfig
} from '@/cypress/e2e/blueprints/aiAgentConfigs';

describe('Multi Agent Chat', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  describe('Agent selection', () => {
    before(() => {
      cy.login();
      // Create a custom agent config
      cy.createAgentConfig(harvesterAgentConfig);
    });

    beforeEach(() => {
      cy.login();

      cy.clearLLMResponses();
      cy.cleanChatHistory();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('It should be possible to manually switch agents', () => {
      chat.console().selectAgent().checkExists();

      const selectAgent = chat.console().selectAgent();

      selectAgent.self().contains('Adaptive Agent(s) Selection');

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
      // Sending 3 messages to trigger a system recommendation to switch agent selection mode
      for (let i = 0; i < 3; i++) {
        cy.enqueueLLMResponse({
          agentResponses: [{ agent: 'rancher' }],
          text:           `Response ${ i + 1 }`
        });
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();

        responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
      }

      // Confirm the mode switch from the system message
      const switchAgentMessage = chat.getMessage(7);

      switchAgentMessage.confirmButton().click();

      switchAgentMessage.isConfirmed();

      // Verify that the selection mode has been switched in the console
      const selectAgent = chat.console().selectAgent();

      selectAgent.self().should('not.contain', 'Adaptive Agent(s) Selection');

      // Verify that the selection mode is reflected in the next messages
      chat.sendMessage('Check current agent');

      const responseMessage = chat.getMessage(8);

      responseMessage.scrollIntoView();
      responseMessage.containsText('Rancher');
      responseMessage.self().should('not.contain', '(Adaptive Mode)');
    });

    it('It should be possible to dismiss agent switch from a system recommendation message', () => {
      // Sending 3 messages to trigger a system recommendation to switch agent selection mode
      for (let i = 0; i < 3; i++) {
        cy.enqueueLLMResponse({
          agentResponses: [{ agent: 'rancher' }],
          text:           `Response ${ i + 1 }`
        });

        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();

        responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
      }

      // Dismiss the mode switch from the system message
      const switchAgentMessage = chat.getMessage(7);

      switchAgentMessage.cancelButton().click();

      switchAgentMessage.isCanceled();

      // Verify that the selection mode is still adaptive in the console
      const selectAgent = chat.console().selectAgent();

      selectAgent.self().contains('Adaptive Agent(s) Selection');

      // Verify that the switch message is not shown again in the next messages
      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      for (let i = 0; i < 6; i++) {
        // Verify that switch message is not shown anymore
        chat.self().should('not.contain', 'Agent has been selected in adaptive mode');

        cy.enqueueLLMResponse({
          agentResponses: [{ agent: 'rancher' }],
          text:           `Response ${ i + 1 }`
        });

        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();

        responseMessage.agentSelectionLabel().contains('Adaptive Agent(s) Selection');
      }
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

    it('It should not show the Adaptive Agent(s) Selection when only one agent is enabled and active', () => {
      // Invalidate all agents except Rancher by setting an invalid MCP URL
      cy.updateAgentConfig({
        ...harvesterAgentConfig,
        spec: { mcpURL: 'invalid-mcp' }
      });

      cy.updateAgentConfig({
        ...fleetAgentConfig,
        spec: { mcpURL: 'invalid-mcp' }
      });

      cy.updateAgentConfig({
        ...provisioningAgentConfig,
        spec: { mcpURL: 'invalid-mcp' }
      });

      chat.console().selectAgent().checkExists();

      const selectAgent = chat.console().selectAgent();

      selectAgent.open();

      // Verify that the Adaptive Agent(s) Selection option is not shown when only one agent is available (Rancher)
      selectAgent.self().should('not.contain', 'Adaptive Agent(s) Selection');

      // Verify that the only available agent is the rancher agent and it is selected
      const rancherAgent = selectAgent.agentItem('rancher');

      rancherAgent.checkSelected();

      // Restore the harvester agent config to have 2 active agents
      // TODO:
      //   Adding a change to systemPrompt to trigger a force update of the agent status.
      //   This is a known issue with the controller that it does not update the status of an agent.
      //   Once fixed, we can remove the systemPrompt change and just update the mcpURL.
      cy.updateAgentConfig({
        ...harvesterAgentConfig,
        spec: {
          ...harvesterAgentConfig.spec,
          systemPrompt: 'Harvester system prompt new',
        }
      });

      // updateAgentConfig only PUTs the spec; wait for the controller to reconcile harvester back to
      // active (2 active agents) before asserting the UI reflects it, instead of racing the reconcile.
      cy.waitForAgentConfigActive(harvesterAgentConfig);

      // Verify that the Adaptive Agent(s) Selection option is shown again and is selected by default
      selectAgent.self().contains('Adaptive Agent(s) Selection');

      selectAgent.open();

      const adaptiveOption = selectAgent.agentItem('__adaptive__');

      adaptiveOption.checkSelected();
    });

    after(() => {
      cy.deleteAgentConfig(harvesterAgentConfig);
      cy.deleteAgentConfig(invalidAgentConfig);
      cy.updateAgentConfig(rancherAgentConfig);
      cy.updateAgentConfig(fleetAgentConfig);
      cy.updateAgentConfig(provisioningAgentConfig);
      cy.clearLLMResponses();
      cy.cleanChatHistory();
    });
  });

  describe('Error handling', () => {
    const globalSettings = new GlobalSettings('_');
    const sideNav = new ProductNavPo();

    beforeEach(() => {
      cy.login();

      cy.clearLLMResponses();
      cy.cleanChatHistory();

      HomePagePo.goTo();
    });

    it('It should show an error message if all agents are disabled', () => {
      // Disable all agents
      cy.updateAgentConfig({
        ...fleetAgentConfig,
        spec: { enabled: false }
      });

      cy.updateAgentConfig({
        ...provisioningAgentConfig,
        spec: { enabled: false }
      });

      cy.updateAgentConfig({
        ...rancherAgentConfig,
        spec: { enabled: false }
      });

      globalSettings.goTo();
      globalSettings.waitForPage();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      cy.contains('None of your AI agents are currently enabled').should('exist');

      chat.open();

      chat.getSystemErrorMessage(1).containsText('No agent configurations available.');
    });

    it('It should show an error message if all enabled agents are in error state', () => {
      // All agents are disabled, create an invalid agent config to have 1 enabled agent but in error state
      cy.createAgentConfig(invalidAgentConfig);

      globalSettings.goTo();
      globalSettings.waitForPage();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      cy.contains('None of your enabled AI agents are currently available.').should('exist');

      chat.open();

      chat.getSystemErrorMessage(1).containsText(`Failed to load MCP tools for agent 'invalid-agent'`);
      chat.getSystemErrorMessage(1).containsText('Please check the AI Agents configuration and ensure the MCP server is accessible.');
    });

    after(() => {
      cy.deleteAgentConfig(invalidAgentConfig);
      cy.updateAgentConfig(rancherAgentConfig);
      cy.updateAgentConfig(fleetAgentConfig);
      cy.updateAgentConfig(provisioningAgentConfig);
      cy.cleanChatHistory();
    });
  });
});