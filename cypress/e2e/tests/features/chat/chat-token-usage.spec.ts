import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

describe('Feature: Chat token usage', () => {
  const chat = new ChatPo();
  const console = new ConsolePo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('Calculates token usage, including welcome message and subagent responses', () => {
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

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    // Check token spent by the welcome message initiated by the system
    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', '1.8K in total')
      .click();

    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', '1,747')
      .and('contain.text', '25')
      .and('contain.text', '1,772')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', '1,772')
      .and('contain.text', 'By Source')
      .and('contain.text', 'ui-tools');

    chat.console().textarea().focus();

    chat.sendMessage('First prompt');

    chat.getMessage(3).isCompleted();

    // Check token usage after sending the first prompt (in addition to the welcome message used tokens)
    console.tokenUsage()
      .should('be.visible')
      .and('contain.text', 'Tokens used:');
    console.tokenUsageLink()
      .should('contain.text', '8.5K in total')
      .click();

    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', '8,384')
      .and('contain.text', '73')
      .and('contain.text', '8,457')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', 'By Source')
      .and('contain.text', 'ui-tools')
      .and('contain.text', '6,030')
      .and('contain.text', '2,427');

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
      .should('contain.text', '42K in total')
      .click();

    console.tokenUsageContent()
      .filter(':visible')
      .should('contain.text', 'Overall Usage')
      .and('contain.text', 'Input')
      .and('contain.text', 'Output')
      .and('contain.text', 'Total')
      .and('contain.text', '41,690')
      .and('contain.text', '347')
      .and('contain.text', '42,037')
      .and('contain.text', 'By Agent')
      .and('contain.text', 'supervisor')
      .and('contain.text', 'Rancher')
      .and('contain.text', '14,771')
      .and('contain.text', 'By Source')
      .and('contain.text', 'agent')
      .and('contain.text', '25,257')
      .and('contain.text', 'ui-tools')
      .and('contain.text', '16,780');
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
  });
});
