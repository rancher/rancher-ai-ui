import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

describe('Feature: Chat token usage', () => {
  const chat = new ChatPo();
  const console = new ConsolePo();

  const toNumber = (text: string) => Number(text.replace(/\D/g, ''));

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('It should track token usage, including welcome message and subagent responses', () => {
    let lastTotal = 0;

    const checkTotalIncreased = () => {
      console.tokenUsageLink()
        .should(($el) => {
          expect(toNumber($el.text())).to.be.greaterThan(lastTotal);
        })
        .then(($el) => {
          lastTotal = toNumber($el.text());
        });
    };

    // This enqueues a response for the welcome message http request.
    cy.enqueueLLMResponse({
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

    console.tokenUsageLoading().should('exist');

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    // Check token spent by the welcome message initiated by the system
    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', 'in total')
      .click();

    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', 'By Source')
      .and('contain.text', 'ui-tools');

    checkTotalIncreased();

    chat.console().textarea().focus();

    chat.sendMessage('First prompt');

    chat.getMessage(3).isCompleted();

    // Check token usage after sending the first prompt (in addition to the welcome message used tokens)
    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', 'in total')
      .click();

    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', 'By Source')
      .and('contain.text', 'ui-tools');

    checkTotalIncreased();

    // Check token usage after sending the second prompt using Rancher agent
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
    });

    chat.sendMessage('Request');

    const responseMessage = chat.getMessage(5);

    responseMessage.isCompleted();

    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', 'in total')
      .click();

    // The input tokens depend on the deployments returned by the cluster, which vary between environments
    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', 'Rancher')
      .and('contain.text', 'By Source')
      .and('contain.text', 'agent')
      .and('contain.text', 'ui-tools');

    checkTotalIncreased();
  });

  it('It should not track token usage when the LLM response does not provide usage data', () => {
    // This enqueues a response for the welcome message http request.
    cy.enqueueLLMResponse({
      uiTools: [
        {
          name: 'suggestions',
          args: {
            suggestion1: 'View resources',
            suggestion2: 'Analyze logs',
            suggestion3: 'Do action',
          }
        }
      ],
      trackUsage: false
    });

    chat.open();

    console.tokenUsageLoading().should('not.exist');

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    console.tokenUsageNotAvailable().should('exist');
  });

  it('It should track partial token usage when the LLM response provide partial usage data', () => {
    // This enqueues a response for the welcome message http request.
    cy.enqueueLLMResponse({
      uiTools: [
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

    welcomeMessage.isCompleted();

    // Add a new message to trigger partial token usage tracking
    cy.enqueueLLMResponse({
      text:       'text text text',
      trackUsage: false
    });

    chat.sendMessage('First prompt');

    chat.getMessage(3).isCompleted();

    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', 'in total');

    console.tokenUsagePartial().should('exist');
  });

  it('It should keep tracking token usage after the chat is closed and reopened', () => {
    // This enqueues a response for the welcome message http request.
    cy.enqueueLLMResponse({
      uiTools: [
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

    let total = 0;

    chat.open();

    chat.getMessage(1).isCompleted();

    console.tokenUsageLink().should('contain.text', 'in total').click();
    console.tokenUsageLink().should(($el) => {
      total = toNumber($el.text());

      expect(total).to.be.greaterThan(0);
    });

    chat.close();
    chat.open();

    console.tokenUsageLink().should('contain.text', 'in total').click();
    console.tokenUsageLink().should(($el) => {
      expect(toNumber($el.text())).to.equal(total);
    });

    chat.console().textarea().focus();

    chat.sendMessage('First prompt');

    chat.getMessage(3).isCompleted();

    console.tokenUsageLink().should('contain.text', 'in total').click();
    console.tokenUsageLink().should(($el) => {
      expect(toNumber($el.text())).to.be.greaterThan(total);
    });
  });

  describe('When the chat cannot start', () => {
    let activeLlm = '';

    before(() => {
      cy.login();
      cy.getRancherResource('v1', 'configmaps', 'cattle-ai-agent-system/llm-config').then((resp) => {
        activeLlm = resp.body.data.ACTIVE_LLM;
      });
      cy.updateAiAssistantConfigs({ ACTIVE_LLM: '' });
    });

    it('It should not show the token usage of a chat that failed to initialize', () => {
      chat.open();

      chat.getSystemErrorMessage(1).containsText('active LLM not specified');

      // The space is kept so the console doesn't move once a chat starts
      console.tokenUsage().should('exist').and('not.be.visible');
      console.tokenUsageLoading().should('not.be.visible');
    });

    after(() => {
      cy.login();
      cy.updateAiAssistantConfigs({ ACTIVE_LLM: activeLlm });
    });
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
  });
});
