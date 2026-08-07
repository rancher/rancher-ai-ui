import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import YamlEditorPo from '@/cypress/e2e/po/staging/yaml-editor.po';
import { getSpecName, Screenshot } from '@/cypress/e2e/utils';

describe(`UI tool: ${ getSpecName() }`, () => {
  const chat = new ChatPo();

  const screenshot = new Screenshot();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });

  it('screenshots', () => {
    cy.setFullScreen();

    cy.login();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.checkExists();

    welcomeMessage.isCompleted();

    welcomeMessage.self().realClick();

    cy.enqueueLLMResponse({
      text:      ['I added "my-label: my-value" to your pod.'],
      uiTools:   [
        {
          name: 'show-yaml-diff',
          args: {
            original:          'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n  namespace: cattle-system\nspec:\n  containers:\n  - name: test\n    image: rancher:latest\n    ports:\n    - containerPort: 80\n',
            patched:           'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n  namespace: cattle-system\n  labels:\n    my-label: my-value\nspec:\n  containers:\n  - name: test\n    image: rancher:latest\n    ports:\n    - containerPort: 80\n',
            resourceKind:      'pod',
            resourceName:      'test',
            resourceNamespace: 'cattle-system',
            title:             'Pod YAML'
          }
        }
      ]
    });

    chat.sendMessage('Can you add "my-label: my-value" to my pod?');

    const resultMessage = chat.getMessage(3);

    const tool = resultMessage.tool().showYamlDiff('pod', 'cattle-system', 'test');

    tool.scrollIntoView().should('be.visible');

    // Show tooltip
    tool.realMouseUp();

    cy.wait(2000);

    tool.should('be.visible');

    screenshot.take();

    tool.realClick();

    const yamlEditor = new YamlEditorPo();

    // Wait for the YAML editor to be visible
    yamlEditor.title().should('contain.text', 'Pod YAML').should('be.visible');

    resultMessage.scrollIntoView();

    cy.wait(1000);

    resultMessage.self().realClick();

    cy.wait(1000);

    tool.should('be.visible');

    screenshot.take();
  });

  after(() => {
    cy.login();
    cy.uninstallUIToolsDefinition();
    cy.cleanChatHistory();
    cy.clearLLMResponses();
  });
});
