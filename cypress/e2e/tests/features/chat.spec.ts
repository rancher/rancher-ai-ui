import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import { FleetDashboardListPagePo } from '@rancher/cypress/e2e/po/pages/fleet/fleet-dashboard.po';
import UsersPo from '@rancher/cypress/e2e/po/pages/users-and-auth/users.po';
import ExtensionsPagePo from '@rancher/cypress/e2e/po/pages/extensions.po';
import { SettingsPagePo } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import { WorkloadsDeploymentsDetailsPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Chat', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  describe('Liz chat should be available in main UI areas', () => {
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
      const settingsPage = new SettingsPagePo('_');

      settingsPage.goTo();
      settingsPage.waitForPage();

      chat.open();
      chat.close();
    });
  });

  describe('Messages', () => {
    beforeEach(() => {
      cy.login();
      cy.clearLLMResponses();

      HomePagePo.goTo();
    });

    it('Show welcome message', () => {
      cy.enqueueLLMResponse({
        text:      'Providing mock response from the agent, containing suggestions for the welcome message. <suggestion>View resources</suggestion><suggestion>Analyze logs</suggestion><suggestion>Do action</suggestion>',
        chunkSize: 30
      });

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.containsText("I'm Liz, your personal AI assistant. How can I help you?");

      const suggestions = ['View resources', 'Analyze logs', 'Do action'];

      suggestions.forEach((value, index) => {
        welcomeMessage.suggestion(index).should('contain.text', value);
      });
    });

    it('Show thinking phase', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text: [
          '<think>',
          'Thinking about the response...',
          ' very', ' very', ' very', ' very', ' very', ' very', ' very', ' very',
          ' very', ' very', ' very', ' very', ' very', ' very', ' very', ' very',
          ' long thinking phase',
          '</think>',
          'Here is the information you requested.',
        ],
      });

      chat.sendMessage('Show me the thinking phase');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Show me the thinking phase');

      const resultMessage = chat.getMessage(3);

      resultMessage.showThinkingButton().click({ force: true });

      resultMessage.containsText('Thinking about the response');

      resultMessage.isCompleted();

      resultMessage.containsText('Here is the information you requested.');
    });

    it('Show list of resources', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      ['Here', ' are the resources'],
        tool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Deployment',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
      });

      chat.sendMessage('Show me the deployments in cattle-ai-agent-system namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Show me the deployments in cattle-ai-agent-system namespace');
      const resourceMessage = chat.getMessage(3);

      resourceMessage.containsText('Here are the resources');

      const deployments = [
        'llm-mock',
        'rancher-ai-agent',
        'rancher-mcp',
      ];

      deployments.forEach((name) => {
        const btn = resourceMessage.resourceButton(name);

        btn.should('exist');
        btn.click();

        const deployment = new WorkloadsDeploymentsDetailsPagePo(name, 'local', 'apps.deployment' as any, 'cattle-ai-agent-system');

        deployment.waitForPage();
      });
    });

    it('Show source links', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      [
          'Here are some documentation links about Rancher: ',
          '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
          '<mcp-doclink>https://www.rancher.com/products/rancher-platform</mcp-doclink>',
          '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ],
        chunkSize: 15
      });

      chat.sendMessage('Provide me some documentation links about Rancher');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Provide me some documentation links about Rancher');

      const resultMessage = chat.getMessage(3);

      const docLinks = [
        {
          label: 'Why Rancher',
          url:   'https://www.rancher.com/why-rancher',
        },
        {
          label: 'Rancher Platform',
          url:   'https://www.rancher.com/products/rancher-platform',
        },
        {
          label: 'Support',
          url:   'https://www.rancher.com/support/',
        },
      ];

      docLinks.forEach(({ label }, index) => {
        resultMessage.sourceLink(index).should('contain.text', label);
      });
    });

    it('Confirm resource action', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

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

      chat.sendMessage('Create a pod named my-pod in default namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Create a pod named my-pod in default namespace');

      const confirmationRequestMessage = chat.getMessage(3);

      confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
      confirmationRequestMessage.confirmButton().click();
      confirmationRequestMessage.isConfirmed();
      confirmationRequestMessage.containsText('Confirmed');

      const resultMessage = chat.getMessage(4);

      resultMessage.containsText('Pod created successfully.');
    });

    it('Cancel resource action', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

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

      chat.sendMessage('Create a pod named my-pod in default namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Create a pod named my-pod in default namespace');

      const confirmationRequestMessage = chat.getMessage(3);

      confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
      confirmationRequestMessage.cancelButton().click();
      confirmationRequestMessage.isCanceled();
      confirmationRequestMessage.containsText('Canceled');
    });
  });
});
