import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import { WorkloadsPodsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads-pods.po';
import { WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';
import RequiredActionPo from '@/cypress/e2e/po/ui-tools/required-action.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import YamlEditorPo from '@/cypress/e2e/po/staging/yaml-editor.po';
import { testPod } from '@/cypress/e2e/blueprints/pod';

describe('UI Tools', () => {
  const chat = new ChatPo();

  describe('Required action: installation', () => {
    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
    });

    it('It should show required action when tools definition is not installed', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.containsText('Install the UI tools to enable full AI capabilities.');
      requiredAction.actionLink().should('be.visible');
    });

    it('It should not show required action when tools definition is installed', () => {
      cy.installUIToolsDefinition();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.checkNotExists();

      cy.uninstallUIToolsDefinition();
    });

    it('It should navigate to settings when clicking on the install link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      settingsPage.settings().uiToolsConfig().intro().self()
        .should('be.visible');
    });

    it('It should hide the required action when tools definition is installed', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      const intro = settingsPage.settings().uiToolsConfig().intro();

      intro.self().should('be.visible');
      intro.actionButton().click();

      requiredAction.checkNotExists();
    });

    after(() => {
      cy.uninstallUIToolsDefinition();
    });
  });

  describe('Required action: refresh', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
      cy.updateUIToolsDefinition();
    });

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();
    });

    it('It should show required action when tools definition has updates available', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.containsText('The UI tools are disabled due to definition change.');
      requiredAction.actionLink().should('be.visible');
    });

    it('It should navigate to settings when clicking on the refresh link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      settingsPage.settings().uiToolsConfig().intro().self()
        .should('be.visible');
    });

    it('It should hide the required action when clicking on the refresh link', () => {
      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      const requiredAction = new RequiredActionPo();

      requiredAction.actionLink().click();

      const settingsPage = new SettingsPagePo();

      settingsPage.waitForPage();

      const intro = settingsPage.settings().uiToolsConfig().intro();

      intro.self().should('be.visible');
      intro.actionButton().click();

      requiredAction.checkNotExists();
    });

    after(() => {
      cy.uninstallUIToolsDefinition();
    });
  });

  describe('Widgets', () => {
    const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local', 'apps.deployment' as any);

    before(() => {
      cy.login();
      cy.createRancherResource('v1', 'pods', JSON.stringify(testPod), false);
      cy.installUIToolsDefinition();
      cy.cleanChatHistory();
    });

    beforeEach(() => {
      cy.login();
      cy.clearLLMResponses();

      deploymentsListPage.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    describe('suggestions', () => {
      it('it shows the list of suggestions and send/edit one suggestion', () => {
        cy.enqueueLLMResponse({
          text:      ['Here', ' are the suggestions.'],
          uiTools:   [
            {
              name: 'suggestions',
              args: {
                suggestion1: 'Show me the resources',
                suggestion2: 'The list of clusters',
                suggestion3: 'Another suggestion',
              }
            }
          ]
        });

        chat.sendMessage('Show me the suggestions');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Show me the suggestions');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        resultMessage.tool().suggestions(0).label()
          .should('be.visible')
          .and('contain.text', 'Show me the resources');
        resultMessage.tool().suggestions(1).label()
          .should('be.visible')
          .and('contain.text', 'The list of clusters');
        resultMessage.tool().suggestions(2).label()
          .should('be.visible')
          .and('contain.text', 'Another suggestion');

        // Send the second suggestion
        resultMessage.tool().suggestions(1).select();

        chat.getMessage(4).containsText('The list of clusters');

        chat.getMessage(5).isCompleted();

        // Edit the third suggestion and send
        resultMessage.tool().suggestions(2).edit();

        chat.console().enter();

        chat.getMessage(6).containsText('Another suggestion');

        chat.getMessage(7).isCompleted();
      });

      it('it should not show suggestions when select-option tool is present', () => {
        cy.enqueueLLMResponse({
          text:      ['Here', ' are the suggestions.'],
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
              name: 'select-option',
              args: {
                option1: 'Deployment',
                option2: 'Pod',
                option3: 'Service',
              }
            }
          ]
        });

        chat.sendMessage('Show me the tools');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Show me the tools');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        resultMessage.tool().suggestions(0).self().should('not.exist');
        resultMessage.tool().suggestions(1).self().should('not.exist');
        resultMessage.tool().suggestions(2).self().should('not.exist');
      });
    });

    describe('select-option', () => {
      it('it should show the list of options and select one option', () => {
        cy.enqueueLLMResponse({
          text:      ['Select an option from the list below.'],
          uiTools:   [
            {
              name: 'select-option',
              args: {
                option1: 'Deployment',
                option2: 'Pod',
                option3: 'Service',
              }
            }
          ]
        });

        chat.sendMessage('Show me the options');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Show me the options');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        resultMessage.tool().selectOption(0).label()
          .should('be.visible')
          .and('contain.text', 'Deployment');
        resultMessage.tool().selectOption(1).label()
          .should('be.visible')
          .and('contain.text', 'Pod');
        resultMessage.tool().selectOption(2).label()
          .should('be.visible')
          .and('contain.text', 'Service');

        // Select the first option
        resultMessage.tool().selectOption(0).select();

        chat.getMessage(4).containsText('Deployment');
      });
    });

    describe('explore', () => {
      it('it should show the explore button and navigate to the correct page when clicking on it', () => {
        cy.enqueueLLMResponse({
          text:      ['Navigate to Rancher using the buttons below.'],
          uiTools:   [
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
            }
          ]
        });

        chat.sendMessage('Request to explore');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Request to explore');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        const explorePods = resultMessage.tool().explore('pods');

        explorePods.click();

        const workloadsPodPage = new WorkloadsPodsListPagePo('local');

        workloadsPodPage.waitForPage();

        const exploreClusters = resultMessage.tool().explore('clusters');

        exploreClusters.click();

        const clustersPage = new ClusterManagerListPagePo('_');

        clustersPage.waitForPage();
      });
    });

    describe('open-console-logs', () => {
      it('it should open the console logs with correct parameters', () => {
        cy.enqueueLLMResponse({
          text:      ['Check the console logs using the button below.'],
          uiTools:   [
            {
              name: 'open-console-logs',
              args: {
                cluster:       'local',
                namespace:     testPod.metadata.namespace,
                name:          testPod.metadata.name,
                containerName: testPod.spec.containers[0].name,
              }
            }
          ]
        });

        chat.sendMessage('Show me the logs');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Show me the logs');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        const showLogs = resultMessage.tool().openConsoleLogs('local', testPod.metadata.namespace, testPod.metadata.name, testPod.spec.containers[0].name);

        showLogs.click();

        cy.get(`[data-testid="horizontal-window-manager"]`).should('contain.text', testPod.metadata.name);
      });
    });

    describe('show-yaml', () => {
      it('it should show the yaml content in the YAML editor', () => {
        cy.enqueueLLMResponse({
          text:      ['See the YAML content using the button below.'],
          uiTools:   [
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

        chat.sendMessage('Show me the YAML');

        const userMessage = chat.getMessage(2);

        userMessage.containsText('Show me the YAML');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        const showYaml = resultMessage.tool().showYaml('pod', 'default', 'test-pod');

        showYaml.click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod YAML');
        yamlEditor.title().should('contain.text', 'default/test-pod');

        // Edit mode buttons should not be visible
        yamlEditor.content().should('not.contain.text', 'Unified')
          .and('not.contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'kind: Pod')
          .and('contain.text', 'name: test-pod')
          .and('contain.text', 'namespace: default');

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');

        yamlEditor.close();

        yamlEditor.checkNotExists();
      });

      it('it should confirm changes when clicking on the confirm button in the YAML editor', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'createKubernetesResource',
              args: {
                kind:      'Pod',
                name:      'my-pod',
                manifest:  `{
                  apiVersion: 'v1',
                  kind:       'Pod',
                  metadata:   {
                    name:      'my-pod',
                    namespace: 'default'
                  },
                }`,
                cluster:   'local',
                namespace: 'default'
              }
            },
          }],
          text: 'Pod creation confirmed.'
        });

        chat.sendMessage('Create a pod named my-pod in default namespace');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'default/my-pod');

        // Edit mode buttons should not be visible
        yamlEditor.content().should('not.contain.text', 'Unified')
          .and('not.contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'kind: Pod')
          .and('contain.text', 'name: my-pod')
          .and('contain.text', 'namespace: default');

        yamlEditor.confirm();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isConfirmed();

        const confirmationResponseMessage = chat.getMessage(4);

        confirmationResponseMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should discard changes when clicking on the cancel button in the YAML editor', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'createKubernetesResource',
              args: {
                kind:      'Pod',
                name:      'my-pod',
                manifest:  `{
                  apiVersion: 'v1',
                  kind:       'Pod',
                  metadata:   {
                    name:      'my-pod',
                    namespace: 'default'
                  },
                }`,
                cluster:   'local',
                namespace: 'default'
              }
            },
          }],
          text: 'Pod creation canceled.'
        });

        chat.sendMessage('Create a pod named my-pod in default namespace');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'default/my-pod');

        // Edit mode buttons should not be visible
        yamlEditor.content().should('not.contain.text', 'Unified')
          .and('not.contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'kind: Pod')
          .and('contain.text', 'name: my-pod')
          .and('contain.text', 'namespace: default');

        yamlEditor.cancel();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isCanceled();
        confirmationRequestMessage.containsText('Canceled');

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should close the editor when confirm a confirmation request in the Chat', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'createKubernetesResource',
              args: {
                kind:      'Pod',
                name:      'my-pod',
                manifest:  `{
                  apiVersion: 'v1',
                  kind:       'Pod',
                  metadata:   {
                    name:      'my-pod',
                    namespace: 'default'
                  },
                }`,
                cluster:   'local',
                namespace: 'default'
              }
            },
          }],
          text: 'Pod creation confirmed.'
        });

        chat.sendMessage('Create a pod named my-pod in default namespace');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'default/my-pod');

        // Edit mode buttons should not be visible
        yamlEditor.content().should('not.contain.text', 'Unified')
          .and('not.contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'kind: Pod')
          .and('contain.text', 'name: my-pod')
          .and('contain.text', 'namespace: default');

        confirmationRequestMessage.confirmButton().click();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isConfirmed();

        const confirmationResponseMessage = chat.getMessage(4);

        confirmationResponseMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should close the editor when cancel a confirmation request in the Chat', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'createKubernetesResource',
              args: {
                kind:      'Pod',
                name:      'my-pod',
                manifest:  `{
                  apiVersion: 'v1',
                  kind:       'Pod',
                  metadata:   {
                    name:      'my-pod',
                    namespace: 'default'
                  },
                }`,
                cluster:   'local',
                namespace: 'default'
              }
            },
          }],
          text: 'Pod creation canceled.'
        });

        chat.sendMessage('Create a pod named my-pod in default namespace');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'default/my-pod');

        // Edit mode buttons should not be visible
        yamlEditor.content().should('not.contain.text', 'Unified')
          .and('not.contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'kind: Pod')
          .and('contain.text', 'name: my-pod')
          .and('contain.text', 'namespace: default');

        confirmationRequestMessage.cancelButton().click();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isCanceled();
        confirmationRequestMessage.containsText('Canceled');

        confirmationRequestMessage.tool().showYaml('Pod', 'default', 'my-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });
    });

    describe('show-yaml-diff', () => {
      it('it should show the yaml diff in the YAML editor', () => {
        cy.enqueueLLMResponse({
          text:      ['See the YAML content using the button below.'],
          uiTools:   [
            {
              name: 'show-yaml-diff',
              args: {
                original:          'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\n  namespace: default\nspec:\n  containers:\n  - name: test-container\n    image: nginx:stable-alpine3.20-perl\n',
                // Same of original + test label
                patched:           'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\n  namespace: default\n  labels:\n    test: "true"\nspec:\n  containers:\n  - name: test-container\n    image: nginx:stable-alpine3.20-perl\n',
                resourceKind:      'pod',
                resourceName:      'test-pod',
                resourceNamespace: 'default',
                title:             'Show Yaml Diff'
              }
            }
          ]
        });

        chat.sendMessage('Show me the YAML diff');

        const resultMessage = chat.getMessage(3);

        resultMessage.isCompleted();

        const showYamlDiff = resultMessage.tool().showYamlDiff('pod', 'default', 'test-pod');

        showYamlDiff.click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Show Yaml Diff');
        yamlEditor.title().should('contain.text', 'default/test-pod');

        // Edit mode buttons should be visible
        yamlEditor.content().should('contain.text', 'Unified')
          .and('contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'labels:')
          .and('contain.text', 'test:');

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');

        yamlEditor.close();

        yamlEditor.checkNotExists();
      });

      it('it should confirm changes when clicking on the confirm button in the YAML editor', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'patchKubernetesResource',
              args: {
                patch: [
                  {
                    op:    'add',
                    path:  '/metadata/labels',
                    value: { test: 'true' }
                  }
                ],
                name:      'test-pod',
                kind:      'Pod',
                cluster:   'local',
                namespace: 'cattle-ai-agent-system'
              }
            },
          }],
          text: 'Pod patch confirmed.'
        });

        chat.sendMessage('Edit test-pod, add the label test=true');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'cattle-ai-agent-system/test-pod');

        // Edit mode buttons should be visible
        yamlEditor.content().should('contain.text', 'Unified')
          .and('contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'labels:')
          .and('contain.text', 'test:');

        yamlEditor.confirm();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isConfirmed();

        const confirmationResponseMessage = chat.getMessage(4);

        confirmationResponseMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should discard changes when clicking on the cancel button in the YAML editor', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'patchKubernetesResource',
              args: {
                patch: [
                  {
                    op:    'add',
                    path:  '/metadata/labels',
                    value: { test1: 'true' }
                  }
                ],
                name:      'test-pod',
                kind:      'Pod',
                cluster:   'local',
                namespace: 'cattle-ai-agent-system'
              }
            },
          }],
          text: 'Pod patch canceled.'
        });

        chat.sendMessage('Edit test-pod, add the label test1=true');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'cattle-ai-agent-system/test-pod');

        // Edit mode buttons should be visible
        yamlEditor.content().should('contain.text', 'Unified')
          .and('contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'labels:')
          .and('contain.text', 'test1:');

        yamlEditor.cancel();

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isCanceled();
        confirmationRequestMessage.containsText('Canceled');

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should close the editor when confirm a confirmation request in the Chat', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'patchKubernetesResource',
              args: {
                patch: [
                  {
                    op:    'add',
                    path:  '/metadata/labels',
                    value: { test2: 'true' }
                  }
                ],
                name:      'test-pod',
                kind:      'Pod',
                cluster:   'local',
                namespace: 'cattle-ai-agent-system'
              }
            },
          }],
          text: 'Pod patch confirmed.'
        });

        chat.sendMessage('Edit test-pod, add the label test2=true');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'cattle-ai-agent-system/test-pod');

        // Edit mode buttons should be visible
        yamlEditor.content().should('contain.text', 'Unified')
          .and('contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'labels:')
          .and('contain.text', 'test2:');

        confirmationRequestMessage.confirmButton().click({ force: true });

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isConfirmed();

        const confirmationResponseMessage = chat.getMessage(4);

        confirmationResponseMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });

      it('it should close the editor when cancel a confirmation request in the Chat', () => {
        cy.enqueueLLMResponse({
          agentResponses: [{
            agent:   'rancher',
            mcpTool: {
              name: 'patchKubernetesResource',
              args: {
                patch: [
                  {
                    op:    'add',
                    path:  '/metadata/labels',
                    value: { test3: 'true' }
                  }
                ],
                name:      'test-pod',
                kind:      'Pod',
                cluster:   'local',
                namespace: 'cattle-ai-agent-system'
              }
            },
          }],
          text: 'Pod patch canceled.'
        });

        chat.sendMessage('Edit test-pod, add the label test3=true');

        const confirmationRequestMessage = chat.getMessage(3);

        confirmationRequestMessage.isCompleted();

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        const yamlEditor = new YamlEditorPo();

        yamlEditor.title().should('contain.text', 'Pod');
        yamlEditor.title().should('contain.text', 'cattle-ai-agent-system/test-pod');

        // Edit mode buttons should be visible
        yamlEditor.content().should('contain.text', 'Unified')
          .and('contain.text', 'Split');

        yamlEditor.content()
          .should('contain.text', 'labels:')
          .and('contain.text', 'test2:') // Old label
          .and('contain.text', 'test3:');

        confirmationRequestMessage.cancelButton().click({ force: true });

        yamlEditor.checkNotExists();

        confirmationRequestMessage.isCanceled();
        confirmationRequestMessage.containsText('Canceled');

        confirmationRequestMessage.tool().showYamlDiff('Pod', 'cattle-ai-agent-system', 'test-pod').click();

        yamlEditor.confirmButton().should('not.exist');
        yamlEditor.cancelButton().should('not.exist');
      });
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });

    after(() => {
      cy.cleanChatHistory();
      cy.uninstallUIToolsDefinition();
      cy.deleteRancherResource('v1', 'pods', `${ testPod.metadata.namespace }/${ testPod.metadata.name }`, false);
    });
  });
});
