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

    let userMessage = chat.getMessage(2);

    userMessage.containsText('Request message.');
    userMessage.context('local').should('exist');

    const responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();

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

    const resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.containsText('Pod created successfully.');

    cy.enqueueLLMResponse({
      text:      'Pod creation canceled.',
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

    chat.sendMessage('Create a pod but cancel');

    confirmationRequestMessage = chat.getMessage(8);

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
    historyResponseMessage.thinkingButton().click({ force: true });

    historyResponseMessage.scrollIntoView();
    historyResponseMessage.containsText('Thinking about the response');

    // Verify main content
    historyResponseMessage.containsText('This is a bold text and this is an italic text.');

    // Verify resource actions
    const deployments = [
      'llm-mock',
      'rancher-ai-agent',
      'rancher-mcp',
    ];

    deployments.forEach((name) => {
      const btn = historyResponseMessage.resourceButton(name);

      btn.should('exist');
    });

    // Verify source links
    historyResponseMessage.sourceLink(0).should('contain.text', 'Why Rancher');
    historyResponseMessage.sourceLink(1).should('contain.text', 'Support');

    // Verify confirmation action
    let historyUserMessage = chat.getMessage(3);

    historyUserMessage.scrollIntoView();
    historyUserMessage.containsText('Create a pod');

    const historyConfirmedMessage = chat.getMessage(4);

    historyConfirmedMessage.confirmButton().should('not.exist');
    historyConfirmedMessage.cancelButton().should('not.exist');
    historyConfirmedMessage.isConfirmed();
    historyConfirmedMessage.containsText('Confirmed');

    const historyResultMessage = chat.getMessage(5);

    historyResultMessage.containsText('Pod created successfully.');

    // Verify cancel action
    historyUserMessage = chat.getMessage(6);

    historyUserMessage.scrollIntoView();
    historyUserMessage.containsText('Create a pod but cancel');

    const historyCanceledMessage = chat.getMessage(7);

    historyCanceledMessage.confirmButton().should('not.exist');
    historyCanceledMessage.cancelButton().should('not.exist');
    historyCanceledMessage.isCanceled();
    historyCanceledMessage.containsText('Canceled');
  });

  after(() => {
    cy.login();
    cy.cleanChatHistory();
  });
});