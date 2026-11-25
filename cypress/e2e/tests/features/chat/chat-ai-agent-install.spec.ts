import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ApplySettingsPromptPo from '@/cypress/e2e/po/dialog/apply-settings.po';
import {
  AGENT_CHART_NAME, AGENT_NAME, AGENT_NAMESPACE, AGENT_REPO_NAME, AGENT_REPO_URL, CHART_VALUES, CLUSTER_REPOS_URL, fakeRepository
} from '@/cypress/e2e/blueprints/aiAgentApp';

// Turned off to let the Apps list return the AI agent release again
let agentAppHidden = true;

// Turned off once the simulated chart installation succeeds
let agentDeploymentHidden = true;

/**
 * Hides the AI agent Helm release from the Apps list, as if the chart was not installed.
 */
function hideAgentApp() {
  agentAppHidden = true;

  cy.intercept('GET', /\/v1\/catalog\.cattle\.io\.apps(\?.*)?$/, (req) => {
    req.continue((res) => {
      if (agentAppHidden) {
        res.body.data = (res.body.data || []).filter((app: any) => app.spec?.chart?.metadata?.name !== AGENT_CHART_NAME);
      }
      res.send(res.body);
    });
  }).as('apps');
}

/**
 * Hides the AI agent Helm repository and makes its creation fail.
 */
function failRepositoryCreation() {
  cy.intercept('GET', CLUSTER_REPOS_URL, (req) => {
    req.continue((res) => {
      res.body.data = (res.body.data || []).filter((repo: any) => repo.spec?.url !== AGENT_REPO_URL);
      res.send(res.body);
    });
  });

  cy.intercept('POST', '/v1/catalog.cattle.io.clusterrepos', {
    statusCode: 403,
    body:       {
      type:    'error',
      code:    'Forbidden',
      message: 'clusterrepos is forbidden'
    },
  }).as('createRepository');
}

/**
 * Serves an already downloaded AI agent Helm repository.
 */
function serveRepository() {
  cy.intercept('GET', CLUSTER_REPOS_URL, (req) => {
    req.continue((res) => {
      res.body.data = [...(res.body.data || []).filter((repo: any) => repo.spec?.url !== AGENT_REPO_URL), fakeRepository];
      res.send(res.body);
    });
  });

  cy.intercept('GET', `/v1/catalog.cattle.io.clusterrepos/${ AGENT_REPO_NAME }`, fakeRepository);
}

/**
 * Hides the AI agent deployment, as if the chart was never deployed.
 */
function hideAgentDeployment() {
  agentDeploymentHidden = true;

  cy.intercept('GET', /\/v1\/apps\.deployments(\?.*)?$/, (req) => {
    req.continue((res) => {
      if (agentDeploymentHidden) {
        res.body.data = (res.body.data || []).filter((d: any) => d.id !== `${ AGENT_NAMESPACE }/${ AGENT_NAME }`);
      }
      res.send(res.body);
    });
  });

  cy.intercept('GET', new RegExp(`/v1/apps\\.deployments/${ AGENT_NAMESPACE }/${ AGENT_NAME }(\\?.*)?$`), (req) => {
    if (agentDeploymentHidden) {
      req.reply({
        statusCode: 404,
        body:       {
          type: 'error',
          code: 'NotFound'
        }
      });
    } else {
      req.continue();
    }
  });
}

/**
 * Serves the AI agent chart info, with its default Helm values.
 */
function serveChart() {
  cy.intercept('GET', new RegExp(`/v1/catalog\\.cattle\\.io\\.clusterrepos/${ AGENT_REPO_NAME }\\?link=info`), {
    chart: {
      name:    AGENT_CHART_NAME,
      version: '1.0.0'
    },
    values: CHART_VALUES
  }).as('chartInfo');
}

/**
 * Simulates the Helm operations run by the chart installation, one per attempt with the given exit code.
 * A successful attempt reveals the real AI agent deployment.
 */
function simulateChartInstall(exitCodes: number[]) {
  let attempt = 0;
  const attemptOf = (url: string) => Number(url.match(/helm-op-(\d+)/)?.[1]);

  // No current release to uninstall
  cy.intercept('GET', new RegExp(`/v1/catalog\\.cattle\\.io\\.apps/${ AGENT_NAMESPACE }/${ AGENT_NAME }(\\?.*)?$`), {
    statusCode: 404,
    body:       {
      type: 'error',
      code: 'NotFound'
    }
  });

  cy.intercept('POST', new RegExp(`/v1/catalog\\.cattle\\.io\\.clusterrepos/${ AGENT_REPO_NAME }\\?action=install`), (req) => {
    attempt++;

    if (exitCodes[attempt - 1] === 0) {
      agentDeploymentHidden = false;
    }

    req.reply({
      operationName:      `helm-op-${ attempt }`,
      operationNamespace: 'cattle-system'
    });
  }).as('installChart');

  cy.intercept('GET', /\/v1\/catalog\.cattle\.io\.operations\/cattle-system\/helm-op-\d+/, (req) => {
    const name = `helm-op-${ attemptOf(req.url) }`;

    req.reply({
      id:       `cattle-system/${ name }`,
      type:     'catalog.cattle.io.operation',
      metadata: {
        name,
        namespace: 'cattle-system'
      },
      status:   {
        podName:      `${ name }-pod`,
        podNamespace: 'cattle-system'
      }
    });
  });

  cy.intercept('GET', /\/v1\/pods\/cattle-system\/helm-op-\d+-pod/, (req) => {
    const n = attemptOf(req.url);

    req.reply({
      id:       `cattle-system/helm-op-${ n }-pod`,
      type:     'pod',
      metadata: {
        name:      `helm-op-${ n }-pod`,
        namespace: 'cattle-system'
      },
      status:   {
        containerStatuses: [{
          name:  'helm',
          state: { terminated: { exitCode: exitCodes[n - 1] } }
        }]
      }
    });
  });

  cy.intercept('GET', /\/pods\/helm-op-\d+-pod\/log/, {
    headers: { 'content-type': 'text/plain' },
    body:    'Error: INSTALLATION FAILED: simulated failure'
  });
}

describe('Chat - AI agent installation', () => {
  const chat = new ChatPo();
  const installAgent = chat.installAgent();
  const settingsPage = new SettingsPagePo();

  beforeEach(() => {
    cy.login();
  });

  it('Should not show the installation panel when the AI agent is installed', () => {
    HomePagePo.goTo();
    chat.open();
    chat.isReady();

    installAgent.checkNotExists();
    chat.console().checkExists();
  });

  it('Should not show the installation panel after a visit to the Extensions page', () => {
    HomePagePo.goTo();
    chat.open();
    chat.isReady();

    // Leaving the Extensions page makes the store forget the Apps
    cy.window().then((win: any) => win.$globalApp.$router.push('/c/local/uiplugins'));
    cy.url().should('include', '/c/local/uiplugins');
    cy.window().then((win: any) => win.$globalApp.$router.push('/home'));
    cy.url().should('include', '/home');

    installAgent.checkNotExists();
    chat.console().checkExists();
  });

  describe('When the AI agent Helm chart is not installed', () => {
    beforeEach(() => {
      hideAgentApp();
    });

    it('Should offer to install the AI agent', () => {
      HomePagePo.goTo();
      chat.open();
      cy.wait('@apps');

      installAgent.checkVisible();
      installAgent.self().should('contain', 'The AI Agent is not installed yet');
      installAgent.startButton().should('be.visible').and('contain', 'Install AI Agent');
      installAgent.step('repository').checkNotExists();
      chat.console().checkNotExists();
    });

    describe('When the Helm repository cannot be added', () => {
      beforeEach(() => {
        failRepositoryCreation();

        HomePagePo.goTo();
        chat.open();
        cy.wait('@apps');

        installAgent.startButton().click();
        cy.wait('@createRepository');
      });

      it('Should show the steps with the repository step failed', () => {
        installAgent.startButton().should('not.exist');
        installAgent.self().should('contain', 'Set up the AI Assistant');

        installAgent.step('repository').isError();
        installAgent.step('repository').error().should('be.visible').and('not.be.empty');
        installAgent.retryButton().should('be.visible');

        installAgent.step('agent').isBlocked();
        installAgent.step('configure').isBlocked();
        installAgent.step('apply').isBlocked();

        installAgent.editValuesButton().should('not.exist');
        installAgent.installChartButton().should('not.exist');
        installAgent.configureButton().should('not.exist');
        installAgent.reloadButton().should('not.exist');
      });

      it('Should try to add the repository again on retry', () => {
        installAgent.retryButton().click();

        cy.wait('@createRepository');
        cy.get('@createRepository.all').should('have.length', 2);
        installAgent.step('repository').isError();
      });

      it('Should keep the installation progress when the chat is reopened', () => {
        chat.close();
        chat.open();

        installAgent.startButton().should('not.exist');
        installAgent.step('repository').isError();
        installAgent.retryButton().should('be.visible');
      });
    });

    describe('When the Helm repository exists and the AI agent is not deployed', () => {
      beforeEach(() => {
        serveRepository();
        serveChart();
        hideAgentDeployment();

        HomePagePo.goTo();
        chat.open();
        cy.wait('@apps');

        installAgent.startButton().click();

        installAgent.step('repository').isDone();
        installAgent.step('agent').isReady();
        installAgent.step('agent').isEnabled();
        installAgent.editValuesButton().should('be.visible').and('contain', 'Edit Values');
        installAgent.installChartButton().should('be.visible').and('contain', 'Install');
      });

      it('Should install the AI agent chart', () => {
        simulateChartInstall([0]);

        installAgent.installChartButton().click();

        cy.wait('@installChart').its('request.body.charts.0').should('include', {
          chartName:   AGENT_CHART_NAME,
          releaseName: AGENT_NAME,
        });

        installAgent.step('agent').isDone(30000);
        installAgent.editValuesButton().should('not.exist');
        installAgent.installChartButton().should('not.exist');

        installAgent.step('configure').isReady();
        installAgent.configureButton().should('be.visible');
      });

      it('Should show the installation error and install the chart again on retry', () => {
        simulateChartInstall([1, 0]);

        installAgent.installChartButton().click();
        cy.wait('@installChart');

        installAgent.step('agent').isError();
        installAgent.step('agent').error().should('contain', 'Helm installation failed: INSTALLATION FAILED: simulated failure');
        installAgent.step('configure').isBlocked();

        installAgent.editValuesButton().should('be.visible');
        installAgent.installChartButton().should('be.visible').and('contain', 'Retry Install').click();
        cy.wait('@installChart');
        cy.get('@installChart.all').should('have.length', 2);

        installAgent.step('agent').isDone(30000);
        installAgent.step('agent').error().should('not.exist');
        installAgent.step('configure').isReady();
      });

      describe('Helm values', () => {
        const valuesModal = installAgent.valuesModal();

        beforeEach(() => {
          installAgent.editValuesButton().click();
          cy.wait('@chartInfo');
          valuesModal.checkVisible();
        });

        it('Should show the chart values with the installer defaults', () => {
          valuesModal.editor().value().should('contain', 'replicaCount: 1')
            .and('contain', 'plan:\n  enabled: true')
            .and('contain', 'planApproval:\n  enabled: true');
          valuesModal.errorBanner().should('not.exist');
        });

        it('Should install the chart with the customized values', () => {
          simulateChartInstall([0]);

          valuesModal.editor().set('replicaCount: 2\nplan:\n  enabled: false\n');
          valuesModal.installButton().click();

          valuesModal.checkNotExists();

          cy.wait('@installChart').its('request.body.charts.0.values').should('deep.equal', {
            replicaCount: 2,
            plan:         { enabled: false },
          });
        });

        it('Should not install invalid YAML', () => {
          valuesModal.editor().set('plan: [unclosed');
          valuesModal.installButton().click();

          valuesModal.checkVisible();
          valuesModal.errorBanner().should('be.visible').and('contain', 'Invalid YAML');

          valuesModal.cancelButton().click();
          valuesModal.checkNotExists();
        });

        it('Should discard the changes on cancel', () => {
          valuesModal.editor().set('replicaCount: 2\n');
          valuesModal.cancelButton().click();

          valuesModal.checkNotExists();

          installAgent.editValuesButton().click();
          valuesModal.editor().value().should('contain', 'replicaCount: 1');
        });

        it('Should restore the default values', () => {
          valuesModal.editor().set('replicaCount: 2\n');
          valuesModal.restoreButton().click();

          valuesModal.checkVisible();
          valuesModal.editor().value().should('contain', 'replicaCount: 1');

          // Only the installer overrides are sent: Helm applies the chart defaults
          simulateChartInstall([0]);
          valuesModal.installButton().click();

          cy.wait('@installChart').its('request.body.charts.0.values').should('deep.equal', {
            plan:         { enabled: true },
            planApproval: { enabled: true },
          });
        });
      });
    });

    describe('When the Helm repository exists and the AI agent is deployed', () => {
      beforeEach(() => {
        serveRepository();

        HomePagePo.goTo();
        chat.open();
        cy.wait('@apps');

        installAgent.startButton().click();
      });

      it('Should complete the repository and agent steps and wait for the configuration', () => {
        installAgent.step('repository').isDone();
        installAgent.step('agent').isDone();

        installAgent.step('configure').isReady();
        installAgent.step('configure').isEnabled();
        installAgent.configureButton().should('be.visible').and('contain', 'Configure AI Assistant');

        installAgent.step('apply').isBlocked();

        installAgent.retryButton().should('not.exist');
        installAgent.editValuesButton().should('not.exist');
        installAgent.installChartButton().should('not.exist');
        installAgent.reloadButton().should('not.exist');
      });

      it('Should link the repository step to the Helm repository', () => {
        installAgent.step('repository').link().should('have.attr', 'href').and('contain', `catalog.cattle.io.clusterrepo/${ AGENT_REPO_NAME }`);
      });

      it('Should keep the agent step done when another page reloads the secrets', () => {
        installAgent.step('agent').isDone();

        cy.intercept('GET', /\/v1\/secrets(\?.*)?$/).as('secrets');

        // The repository creation page loads its own list of secrets, which replaces the ones in the store
        cy.window().then((win: any) => win.$globalApp.$router.push('/c/_/manager/catalog.cattle.io.clusterrepo/create'));
        cy.url().should('include', 'catalog.cattle.io.clusterrepo/create');
        cy.wait('@secrets');

        installAgent.step('agent').isDone();
        installAgent.step('agent').error().should('not.exist');
        installAgent.step('configure').isReady();
      });

      it('Should open the AI Assistant settings to configure the AI provider', () => {
        installAgent.configureButton().click();

        cy.url().should('include', '/c/local/settings/rancher-ai-ui').and('include', 'section=ai-agent-settings');

        settingsPage.settings().aiAgentSettings().checkExists();
        settingsPage.agentNotInstalledState().checkNotExists();

        // The settings page is already open: the step waits for the user to apply the settings
        installAgent.step('configure').isReady();
        installAgent.configureButton().should('not.exist');
      });

      it('Should apply the settings, redeploy the AI agent and load the chat', () => {
        installAgent.configureButton().click();
        settingsPage.settings().aiAgentSettings().checkExists();

        // The agent was deployed before the installation and can have chats: applying asks first
        settingsPage.settings().saveButton().click();
        new ApplySettingsPromptPo().confirm();

        installAgent.step('configure').isDone(30000);
        installAgent.step('apply').isDone(30000);
        installAgent.step('apply').self().should('contain', 'The AI Assistant is configured and the AI Agent is up and running.');

        installAgent.reloadButton().scrollIntoView();
        installAgent.reloadButton().should('be.visible').and('contain', 'Start chatting');

        // A real installation adds the Helm release: let the Apps list return it again
        cy.then(() => {
          agentAppHidden = false;
        });

        installAgent.reloadButton().click();

        installAgent.checkNotExists();
        chat.isReady();
        chat.console().checkExists();
      });
    });
  });
});
