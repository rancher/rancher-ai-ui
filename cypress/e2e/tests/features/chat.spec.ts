import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import { FleetDashboardListPagePo } from '@rancher/cypress/e2e/po/pages/fleet/fleet-dashboard.po';
import UsersPo from '@rancher/cypress/e2e/po/pages/users-and-auth/users.po';
import ExtensionsPagePo from '@rancher/cypress/e2e/po/pages/extensions.po';
import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import { SettingsPagePo as GlobalSettings } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { SlidingBadgePo } from '@/cypress/e2e/po/hook.po';
import ContextPo from '@/cypress/e2e/po/context.po';
import RancherSettingsBannersPo from '@/cypress/e2e/po/components/rancher-settings-banners.po';
import ApplySettingsPromptPo from '@/cypress/e2e/po/dialog/apply-settings.po';
import { rancherAgentConfig, fleetAgentConfig, provisioningAgentConfig } from '@/cypress/e2e/blueprints/aiAgentConfigs';

describe('Chat', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  describe('Availability across UI products', () => {
    it('Home', () => {
      HomePagePo.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster dashboard', () => {
      const localClusterDashboard = new ClusterDashboardPagePo('local');

      localClusterDashboard.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster management', () => {
      const clusterList = new ClusterManagerListPagePo();

      clusterList.goTo();
      clusterList.waitForPage();

      chat.open();
      chat.close();
    });

    it('Fleet', () => {
      const fleetDashboardPage = new FleetDashboardListPagePo('_');

      fleetDashboardPage.goTo();
      fleetDashboardPage.waitForPage();

      chat.open();
      chat.close();
    });

    it('Users', () => {
      const usersPo = new UsersPo();

      usersPo.goTo();
      usersPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Extensions', () => {
      const extensionsPo = new ExtensionsPagePo();

      extensionsPo.goTo();
      extensionsPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Settings', () => {
      const settingsPage = new GlobalSettings('_');

      settingsPage.goTo();
      settingsPage.waitForPage();

      chat.open();
      chat.close();
    });
  });

  describe('Disconnections handling', () => {
    beforeEach(() => {
      cy.login();
    });

    it('it should support reconnections on settings changes', () => {
      // Go to Settings page
      const globalSettings = new GlobalSettings('_');
      const settingsPage = new SettingsPagePo();

      globalSettings.goTo();
      globalSettings.waitForPage();

      const sideNav = new ProductNavPo();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      // Open the chat
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      chat.sendMessage('User request');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('User request');

      const resultMessage = chat.getMessage(3);

      resultMessage.isCompleted();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Reconnecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Reconnecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(4);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(5);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should support reconnections when opening the chat and settings changes are applying', () => {
      // Go to Settings page
      const globalSettings = new GlobalSettings('_');
      const settingsPage = new SettingsPagePo();

      globalSettings.goTo();
      globalSettings.waitForPage();

      const sideNav = new ProductNavPo();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      // Open the chat
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      chat.sendMessage('User request');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('User request');

      const resultMessage = chat.getMessage(3);

      resultMessage.isCompleted();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Reconnecting').should('be.visible');

      chat.close();
      chat.open();

      // Reconnection should happen and the chat should be ready after that
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(4);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(5);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should handle disconnections when the ai service becomes unavailable', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      // Check for the disconnected phase and error message
      chat.isNotReady();
      chat.phase('Disconnected').should('be.visible');

      chat.getSystemErrorMessage(1).containsText('Rancher AI Agent pod not found. Please ensure the Rancher AI assistant services are correctly installed and you have the necessary permissions to access it.');

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(2);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(3);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should support reconnections when opening the chat and the AI service is unavailable', () => {
      HomePagePo.goTo();

      cy.installRancherAIService({ waitForAIServiceReady: false });

      chat.open();

      // Check for the reconnecting phase
      chat.isNotReady();
      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(2);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(3);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    it('it should support reconnections from no available agents condition (chat errors handling)', () => {
      // Disable all agents
      cy.updateAgentConfig({
        ...rancherAgentConfig,
        spec: { enabled: false }
      });

      cy.updateAgentConfig({
        ...fleetAgentConfig,
        spec: { enabled: false }
      });

      cy.updateAgentConfig({
        ...provisioningAgentConfig,
        spec: { enabled: false }
      });

      const globalSettings = new GlobalSettings('_');
      const sideNav = new ProductNavPo();

      globalSettings.goTo();
      globalSettings.waitForPage();

      sideNav.navToSideMenuEntryByLabel('AI Assistant');

      cy.contains('None of your AI agents are currently enabled').should('exist');

      HomePagePo.goTo();

      chat.open();

      chat.isNotReady();
      chat.getSystemErrorMessage(1).containsText('No agent configurations available.');

      // Re-install the chart, including the mcp, to make the agents available again and allow reconnection
      cy.installRancherAIService({ waitForAIServiceReady: false });

      chat.phase('Connecting').should('be.visible');

      chat.isReady(20000);
      chat.phase('Connecting').should('not.exist');

      // Check that the chat is working after reconnection
      chat.sendMessage('User request after reconnection');

      const userMessageAfterReconnection = chat.getMessage(2);

      userMessageAfterReconnection.containsText('User request after reconnection');

      const resultMessageAfterReconnection = chat.getMessage(3);

      resultMessageAfterReconnection.containsText('Mock service');

      resultMessageAfterReconnection.isCompleted();
    });

    after(() => {
      cy.installRancherAIService();
    });
  });

  describe('Scroll handling', () => {
    const history = new HistoryPo();

    before(() => {
      cy.login();
      cy.cleanChatHistory();
      cy.installUIToolsDefinition();
    });

    beforeEach(() => {
      cy.login();
    });

    it('it should automatically scroll to bottom when message stream is in progress', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
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
        mcpTool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Deployment',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
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
      });

      chat.sendMessage('Request');

      const responseMessage = chat.getMessage(3);

      responseMessage.isCompleted();

      // Wait for the UI tools to be rendered
      chat.getMessage(3).tool().suggestions(0).self()
        .should('exist');

      // Verify that the Request message is not visible and the last message is visible, meaning that the chat has scrolled to the bottom during the stream
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(3).self().should('be.visible');

      // Verify that the Related Resources section is visible meaning that the chat has scrolled to the bottom even with the presence of UI tools and others elements in the message
      const deployments = [
        'llm-mock',
        'rancher-ai-agent',
        'rancher-mcp-server',
      ];

      deployments.forEach((name) => {
        const btn = chat.getMessage(3).resourceButton({ name });

        btn.should('be.visible');
      });

      // Verify that the message is entirely visible and not cut, meaning that the chat has scrolled to the bottom and the user can see the full message
      chat.getMessage(3).timestamp().should('be.visible');

      chat.scrollButton().checkNotExists();
    });

    it('it should automatically scroll to bottom when receiving a confirmation message', () => {
      HomePagePo.goTo();

      chat.open();
      chat.isReady();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      'Pod creation confirmed.',
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
            },
            cluster:   'local',
            namespace: 'default'
          }
        },
      });

      chat.sendMessage('Create a pod named my-pod in default namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Create a pod named my-pod in default namespace');

      // Verify the processing label is visible and not covered by the console panel
      chat.phase('Awaiting confirmation').then(($phase) => {
        new ContextPo().self().then(($context) => {
          const phaseRect = $phase[0].getBoundingClientRect();
          const contextRect = $context[0].getBoundingClientRect();

          expect(contextRect.top + 2).to.be.greaterThan(phaseRect.top);
        });
      });
    });

    it('it should not scroll to bottom when message stream is in progress and user scrolls up', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text: [
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' very very', ' very very', ' very very',
          ' long response',
        ],
      });

      chat.sendMessage('Request');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Request');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      const responseMessage = chat.getMessage(3);

      // Verify that the Request and Response messages are not visible
      userMessage.self().should('not.be.visible');
      responseMessage.self().should('not.be.visible');

      // Response is still streaming...
      responseMessage.isCompleted();

      // Verify that the Request and Response messages are still not visible meaning that the chat has not scrolled to the bottom
      userMessage.self().should('not.be.visible');
      responseMessage.self().should('not.be.visible');

      chat.scrollButton().self().should('be.visible');
    });

    it('it should automatically scroll to bottom when new message arrives', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      // Verify that the request message is not visible and the last message is visible, meaning that the chat has scrolled to the bottom
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(5).self().should('be.visible');

      chat.scrollButton().checkNotExists();
    });

    it('it should automatically scroll to bottom when close and reopen the chat panel', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      // Verify that the request message is not visible and the last message is visible, meaning that the chat has scrolled to the bottom
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(5).self().should('be.visible');

      chat.scrollButton().checkNotExists();

      chat.close();
      chat.open();

      // Verify that the chat has scrolled to the bottom after reopening and the last message is visible
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(5).self().should('be.visible');

      chat.scrollButton().checkNotExists();
    });

    it('it should scroll to bottom when clicking the scroll button', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Fast scroll button should be visible
      chat.scrollButton().self().should('be.visible');

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');

      chat.scrollButton().self().click();

      // Verify that the chat has scrolled to the bottom and the last message is visible
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(5).self().should('be.visible');

      // Verify that the scroll button is not visible anymore
      chat.scrollButton().checkNotExists();
    });

    it('it should scroll to bottom when the user sends a new message from the console', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');
      chat.scrollButton().self().should('be.visible');

      cy.enqueueLLMResponse({
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
      });

      // Send a new message
      chat.sendMessage('New Request');

      // Verify that the chat has scrolled to the bottom and the new request is visible
      chat.getMessage(6).self().should('be.visible');

      const newResponseMessage = chat.getMessage(7);

      newResponseMessage.isCompleted();

      // Verify that the chat continues to scroll to the bottom and the new response is visible
      chat.getMessage(6).self().should('not.be.visible');
      chat.getMessage(7).self().should('be.visible');

      chat.scrollButton().checkNotExists();
    });

    it('it should scroll to bottom when the user re-sends a message', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');
      chat.scrollButton().self().should('be.visible');

      // Re-send the first message
      chat.getMessage(2).resendButton().click();

      // Verify that the chat has scrolled to the bottom and the new request is visible
      chat.getMessage(6).self().should('be.visible');
      chat.getMessage(6).containsText('Request 1');

      // Verify that the chat continues to scroll to the bottom and the new response is visible
      chat.getMessage(7).isCompleted();
      chat.getMessage(7).self().should('be.visible');

      chat.scrollButton().checkNotExists();
    });

    it('it should scroll to bottom when the user sends a message from a sliding badge', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');
      chat.scrollButton().self().should('be.visible');

      cy.enqueueLLMResponse({
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
          ' long response from sliding badge',
        ],
      });

      const homePage = new HomePagePo();

      const homeClusterList = homePage.list();

      const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

      const slidingBadge = new SlidingBadgePo(statusColumn);

      slidingBadge.click();

      // Verify that the chat has scrolled to the bottom and the new request is visible
      chat.getMessage(6).self().should('be.visible');

      const newResponseMessage = chat.getMessage(7);

      newResponseMessage.isCompleted();

      // Verify that the chat continues to scroll to the bottom and the new response is visible
      chat.getMessage(6).self().should('not.be.visible');
      chat.getMessage(7).self().should('be.visible');
      chat.getMessage(7).containsText('long response from sliding badge');

      chat.scrollButton().checkNotExists();
    });

    it('it should scroll to bottom when opening an old chat', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text: [
          ' very very very very very very very very',
          ' very very very very very very very very',
          ' long response',
        ],
        mcpTool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Deployment',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
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
          }
        ]
      });

      chat.sendMessage('Request');

      const responseMessage = chat.getMessage(3);

      responseMessage.isCompleted();

      responseMessage.tool().explore('pods').should('exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      chat.scrollButton().self().should('be.visible');

      // Verify that the last message is not visible
      responseMessage.self().should('not.be.visible');

      history.open();

      // Create a new chat to have at least 2 chats in the history
      history.createChat();

      const newChatWelcomeMessage = chat.getMessage(1);

      newChatWelcomeMessage.isCompleted();

      // Verify that the scroll button is not visible
      chat.scrollButton().checkNotExists();

      // Send multiple messages to expand the second chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');
      chat.scrollButton().self().should('be.visible');

      history.open();

      // Re-open the first chat
      history.chatItem(1).select();

      // Verify that the scroll button is not visible
      chat.scrollButton().checkNotExists();

      // Verify that the chat has scrolled to the bottom and the last message is visible
      chat.getMessage(1).self().should('not.be.visible');
      chat.getMessage(2).self().should('be.visible');

      // Verify that the Related Resources section is visible meaning that the chat has scrolled to the bottom even with the presence of UI tools and others elements in the message
      const deployments = [
        'llm-mock',
        'rancher-ai-agent',
        'rancher-mcp-server',
      ];

      deployments.forEach((name) => {
        const btn = chat.getMessage(2).resourceButton({ name });

        btn.should('be.visible');
      });

      // Verify that the message is entirely visible and not cut, meaning that the chat has scrolled to the bottom and the user can see the full message
      chat.getMessage(2).timestamp().should('be.visible');
    });

    it('it should scroll to bottom on system error message', () => {
      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      // Send multiple messages to expand the chat
      for (let i = 0; i < 2; i++) {
        chat.sendMessage(`Request ${ i + 1 }`);

        const responseMessage = chat.getMessage(3 + (i * 2));

        responseMessage.isCompleted();
      }

      chat.phase('Processing UI Tools').should('not.exist');

      // Verify that the request message is not visible and the last message is visible, meaning that the chat has scrolled to the bottom
      chat.getMessage(2).self().should('not.be.visible');
      chat.getMessage(5).self().should('be.visible');

      chat.scrollButton().checkNotExists();

      // Scroll to top
      chat.getMessage(1).scrollIntoView();

      // Verify that the last message is not visible
      chat.getMessage(5).self().should('not.be.visible');
      chat.scrollButton().self().should('be.visible');

      cy.uninstallRancherAIService();

      const systemErrorMessage = chat.getSystemErrorMessage(1);

      systemErrorMessage.self().should('be.visible');
      systemErrorMessage.containsText('Rancher AI Agent pod not found. Please ensure the Rancher AI assistant services are correctly installed and you have the necessary permissions to access it.');

      cy.installRancherAIService({ waitForAIServiceReady: true });
    });

    after(() => {
      cy.login();
      cy.cleanChatHistory();
      cy.uninstallUIToolsDefinition();
    });
  });

  describe('Panels dimension', () => {
    describe('Chat panel', () => {
      beforeEach(() => {
        cy.login();
      });

      it('it should have the correct height', () => {
        HomePagePo.goTo();

        chat.open();

        chat.header().closeButton().should('be.visible');

        chat.console().llmInfo().should('be.visible');
      });

      it('it should have the correct height when Header and Footer banners are visible', () => {
        const globalSettings = new GlobalSettings('_');
        const sideNav = new ProductNavPo();

        globalSettings.goTo();
        globalSettings.waitForPage();

        sideNav.navToSideMenuEntryByLabel('Banners');

        const bannersPage = new RancherSettingsBannersPo();

        bannersPage.addBanners();

        HomePagePo.goTo();

        chat.open();
        chat.isReady();

        chat.header().closeButton().should('be.visible');

        chat.console().llmInfo().should('be.visible');

        globalSettings.goTo();
        globalSettings.waitForPage();

        sideNav.navToSideMenuEntryByLabel('Banners');

        bannersPage.removeBanners();
      });
    });

    describe('History panel', () => {
      it('it should have the correct height', () => {
        HomePagePo.goTo();

        chat.open();
        chat.isReady();

        chat.header().historyButton().click();

        const historyPanel = new HistoryPo();

        historyPanel.self()
          .should('exist')
          .then(($el) => {
            cy.get('.main-layout').then(($mainLayout) => {
              new RancherHeaderPo().self().then(($header) => {
                const panelRect = $el[0].getBoundingClientRect();

                const rancherHeaderRect = $header[0].getBoundingClientRect();
                const rancherMainLayoutRect = $mainLayout[0].getBoundingClientRect();

                // History panel should not extend beyond main layout (+ 10px tolerance)
                expect(panelRect.bottom).to.be.lessThan(rancherHeaderRect.bottom + rancherMainLayoutRect.bottom + 10);
              });
            });
          });
      });

      it('it should have the correct height when Header and Footer banners are visible', () => {
        const globalSettings = new GlobalSettings('_');
        const sideNav = new ProductNavPo();

        globalSettings.goTo();
        globalSettings.waitForPage();

        sideNav.navToSideMenuEntryByLabel('Banners');

        const bannersPage = new RancherSettingsBannersPo();

        bannersPage.addBanners();

        HomePagePo.goTo();

        chat.open();
        chat.isReady();

        chat.header().historyButton().click();

        const historyPanel = new HistoryPo();

        historyPanel.self()
          .should('exist')
          .then(($el) => {
            cy.get('.main-layout').then(($mainLayout) => {
              new RancherHeaderPo().self().then(($header) => {
                const panelRect = $el[0].getBoundingClientRect();

                const rancherHeaderRect = $header[0].getBoundingClientRect();
                const rancherMainLayoutRect = $mainLayout[0].getBoundingClientRect();

                // History panel should not extend beyond main layout (+ 10px tolerance)
                expect(panelRect.bottom).to.be.lessThan(rancherHeaderRect.bottom + rancherMainLayoutRect.bottom + 10);
              });
            });
          });

        globalSettings.goTo();
        globalSettings.waitForPage();

        sideNav.navToSideMenuEntryByLabel('Banners');

        bannersPage.removeBanners();
      });
    });
  });
});
