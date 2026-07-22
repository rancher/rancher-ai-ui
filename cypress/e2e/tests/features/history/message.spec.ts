import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import { WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';

describe('History Messages', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  before(() => {
    cy.login();
    cy.cleanChatHistory();
    cy.installUIToolsDefinition();
  });

  beforeEach(() => {
    cy.login();
    cy.clearLLMResponses();

    HomePagePo.goTo();
  });

  it('It should properly parse messages from history chats', () => {
    // Navigate to deployments page to have context
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    chat.open();

    let welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    // Create chat to populate history
    cy.enqueueLLMResponse({
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
      uiTools: [
        {
          name: 'suggestions',
          args: {
            suggestion1: 'Show me the resources in local cluster',
            suggestion2: 'Find my deployments',
            suggestion3: 'Analyze the health status of my clusters',
          }
        },
        {
          name: 'explore',
          args: {
            route:   'pods',
            cluster: 'local',
            label:   'View Pods'
          }
        },
        {
          name: 'explore',
          args: {
            route:   'clusters',
            label:   'View Clusters'
          }
        },
        {
          name: 'show-yaml',
          args: {
            yaml:              'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\n  namespace: default\nspec:\n  containers:\n  - name: test-container\n    image: nginx:stable-alpine3.20-perl\n',
            resourceKind:      'pod',
            resourceName:      'test-pod',
            resourceNamespace: 'default',
            title:             'Pod YAML'
          }
        }
      ]
    });

    chat.sendMessage('Request message.');

    let userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');
    userMessage.context('local').should('exist');

    const responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   'rancher',
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
      }],
      text: 'Pod created successfully.'
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();

    const resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.containsText('Pod created successfully.');

    cy.enqueueLLMResponse({
      agentResponses: [{
        agent:   'rancher',
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
      }],
      text: 'Pod creation canceled.'
    });

    chat.sendMessage('Create a pod but cancel');

    confirmationRequestMessage = chat.getMessage(8);

    confirmationRequestMessage.scrollIntoView();
    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.cancelButton().click();
    confirmationRequestMessage.isCanceled();
    confirmationRequestMessage.containsText('Canceled');

    /**
     * The agent does not continue to process the tool action when the confirmation request
     * is canceled, so it doesn't produce a result message in this case.
     */
    // resultMessage.containsText('Pod creation canceled.');

    // Create a new chat to trigger the history population
    history.open();
    history.createChat();

    welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    // Now open history and select the previous chat
    history.open();
    history.chatItem(0).select();
    chat.isReady();

    // Verify user context tags
    userMessage = chat.getMessage(1);

    userMessage.scrollIntoView();
    userMessage.containsText('Request message.');
    userMessage.context('local').should('exist');

    // Verify that the reponse message is properly parsed
    const historyResponseMessage = chat.getMessage(2);

    // Verify thinking content
    historyResponseMessage.scrollIntoView();
    historyResponseMessage.thinkingButton().click();

    historyResponseMessage.scrollIntoView();
    historyResponseMessage.containsText('Thinking about the response');

    // Verify main content
    historyResponseMessage.containsText('This is a bold text and this is an italic text.');

    // Verify resource actions
    const deployments = [
      'llm-mock',
      'rancher-ai-agent',
      'rancher-mcp-server',
    ];

    deployments.forEach((name) => {
      const btn = historyResponseMessage.resourceButton({ name });

      btn.should('exist');
    });

    // Verify source links
    historyResponseMessage.sourceLink(0).should('contain.text', 'Why Rancher');
    historyResponseMessage.sourceLink(1).should('contain.text', 'Support');

    // Verify UI tools
    historyResponseMessage.tool().suggestions(0).self().scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Show me the resources in local cluster');
    historyResponseMessage.tool().suggestions(1).self().scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Find my deployments');
    historyResponseMessage.tool().suggestions(2).self().scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Analyze the health status of my clusters');
    historyResponseMessage.tool().explore('pods').scrollIntoView().should('be.visible')
      .and('contain.text', 'View Pods');
    historyResponseMessage.tool().explore('clusters').scrollIntoView().should('be.visible')
      .and('contain.text', 'View Clusters');
    historyResponseMessage.tool().showYaml('pod', 'default', 'test-pod')
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'test-pod');

    // Verify confirmation action
    let historyUserMessage = chat.getMessage(3);

    historyUserMessage.scrollIntoView();
    historyUserMessage.containsText('Create a pod');

    const historyConfirmedMessage = chat.getMessage(4);

    historyConfirmedMessage.scrollIntoView();
    historyConfirmedMessage.confirmButton().should('not.exist');
    historyConfirmedMessage.cancelButton().should('not.exist');
    historyConfirmedMessage.isConfirmed();

    const historyResultMessage = chat.getMessage(5);

    historyResultMessage.scrollIntoView();
    historyResultMessage.containsText('Pod created successfully.');

    // Verify cancel action
    historyUserMessage = chat.getMessage(6);

    historyUserMessage.scrollIntoView();
    historyUserMessage.containsText('Create a pod but cancel');

    const historyCanceledMessage = chat.getMessage(7);

    historyCanceledMessage.scrollIntoView();
    historyCanceledMessage.confirmButton().should('not.exist');
    historyCanceledMessage.cancelButton().should('not.exist');
    historyCanceledMessage.isCanceled();
  });

  after(() => {
    cy.login();
    cy.cleanChatHistory();
    cy.uninstallUIToolsDefinition();
  });
});