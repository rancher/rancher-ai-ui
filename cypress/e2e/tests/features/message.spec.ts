import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import { WorkloadsDeploymentsDetailsPagePo, WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Messages', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('Show welcome message', () => {
    cy.enqueueLLMResponse({
      text:      'Init message',
      chunkSize: 30,
      agent:     null, // Welcome message uses 'rancher' as manual agent - the backend skips the agent selection.
      uiTools:   [
        {
          name: 'suggestions',
          args: {
            suggestion1: 'View resources',
            suggestion2: 'Analyze logs',
            suggestion3: 'Do action',
          }
        }
      ]
    });

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.containsText("I'm Liz, your personal AI assistant. How can I help you?");

    const suggestions = ['View resources', 'Analyze logs', 'Do action'];

    suggestions.forEach((value, index) => {
      welcomeMessage.option(index).should('contain.text', value);
    });
  });

  it('Show context', () => {
    // Navigate to deployments page to have context
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({
      text: [
        'Her is the ',
        'context from Rancher UI',
      ],
    });

    chat.sendMessage('Show me the context from Rancher UI');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Show me the context from Rancher UI');

    const resultMessage = chat.getMessage(3);

    resultMessage.context('local').should('exist');
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

    resultMessage.thinkingLabel().should('exist');

    resultMessage.thinkingButton().click({ force: true });

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

    userMessage.scrollIntoView();
    userMessage.containsText('Show me the deployments in cattle-ai-agent-system namespace');

    const resourceMessage = chat.getMessage(3);

    resourceMessage.scrollIntoView();
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

  it('Confirm single-resource action', () => {
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

    userMessage.scrollIntoView();
    userMessage.containsText('Create a pod named my-pod in default namespace');

    const confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.containsText('Confirmed');

    const resultMessage = chat.getMessage(4);

    resultMessage.containsText('Pod created successfully.');
  });

  it('Confirm multi-resource action', () => {
    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    /**
     * At the moment the backend only supports 1 resource per message,
     * but the frontend is already able to handle array of resources.
     *
     * TODO: add a test with multiple resources when the backend supports it.
     */
    cy.enqueueLLMResponse({
      text:      'Pod created successfully.',
      tool: {
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

    userMessage.scrollIntoView();
    userMessage.containsText('Create a pod named my-pod in default namespace');

    const confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.containsText('Confirmed');

    const resultMessage = chat.getMessage(4);

    resultMessage.containsText('Pod created successfully.');
  });

  it('Cancel single-resource action', () => {
    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({
      text:      'Pod creation canceled.',
      tool: {
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

    userMessage.scrollIntoView();
    userMessage.containsText('Create a pod named my-pod in default namespace');

    const confirmationRequestMessage = chat.getMessage(3);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.cancelButton().click();
    confirmationRequestMessage.isCanceled();
    confirmationRequestMessage.containsText('Canceled');
  });

  after(() => {
    cy.clearLLMResponses();
  });
});
