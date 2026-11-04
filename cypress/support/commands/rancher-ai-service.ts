import { InstallRancherAIServiceArgs } from '@/cypress/globals';
import { rancherApiUrl } from '../utils/rancher-url';

/**
 * Resolves a kubeconfig for the local cluster and yields its path.
 *
 * In the Helm-on-k3s CI topology a direct kubeconfig for the cluster is already on disk
 * (written by install-rancher-helm.sh, path passed via the `kubeconfig` Cypress env). We use it
 * directly because (a) Rancher's `generateKubeconfig` action returns a proxied kubeconfig
 * whose `config` is empty here, and (b) helm release metadata is only visible from the same
 * (direct) kubeconfig the charts were installed with, so `helm uninstall` actually tears the
 * agent down - which the disconnection tests depend on. Falls back to `generateKubeconfig`
 * for environments that don't provide a direct kubeconfig.
 */
function resolveKubeconfig(): Cypress.Chainable<string> {
  const directKubeconfig = Cypress.env('kubeconfig');

  if (directKubeconfig) {
    return cy.wrap<string>(directKubeconfig, { log: false });
  }

  return cy.getCookie('CSRF').then((token) => {
    return cy.request({
      method:  'POST',
      url:     rancherApiUrl('/v3/clusters/local?action=generateKubeconfig'),
      headers: {
        'x-api-csrf': token?.value,
        Accept:       'application/json'
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);

      const kubeconfig = `${ Cypress.config('downloadsFolder') }/local.yaml`;

      // cy.writeFile only enqueues the write, so the path has to be yielded from its chain -
      // returning it directly would mix async and sync code and fail the command.
      return cy.writeFile(kubeconfig, resp.body.config).then(() => kubeconfig);
    });
  });
}

/**
 * Installs Rancher AI to the local cluster.
 */
Cypress.Commands.add('installRancherAIService', ( args: InstallRancherAIServiceArgs = { waitForAIServiceReady: true }) => {
  return resolveKubeconfig().then((kubeconfig) => {
    const waitFlag = args.waitForAIServiceReady ? 'true' : 'false';
    const fetchReposFlag = 'false';

    const cmd = `.github/scripts/deploy-rancher-ai.sh ${ kubeconfig } ${ waitFlag } ${ fetchReposFlag }`;

    cy.log('Cmd to execute:', cmd, 'flags: waitForAIServiceReady =', waitFlag, ', fetchRepos =', fetchReposFlag);

    cy.exec(cmd, {
      failOnNonZeroExit: false,
      timeout:           240000
    }).then((result) => {
      if (args.waitForAIServiceReady) {
        cy.log(`Script output: ${ result.stdout || 'None' }`);
        cy.log(`Script error: ${ result.stderr || 'None' }`);

        expect(result.exitCode).to.eq(0);
      }
    });
  });
});

/**
 * Uninstalls Rancher AI from the local cluster.
 */
Cypress.Commands.add('uninstallRancherAIService', () => {
  return resolveKubeconfig().then((kubeconfig) => {
    const cmd = `.github/scripts/uninstall-rancher-ai.sh ${ kubeconfig }`;

    cy.exec(cmd, {
      failOnNonZeroExit: false,
      timeout:           240000
    }).then((result) => {
      cy.log(`Script output: ${ result.stdout || 'None' }`);
      cy.log(`Script error: ${ result.stderr || 'None' }`);

      expect(result.exitCode).to.eq(0);
    });

    // Wait some time for the uninstalled schemas to be removed from Rancher
    cy.wait(2000);
  });
});

/**
 * Updates the AI Assistant configurations by modifying the relevant ConfigMap and Secret, then restarts the Ai Agent deployment.
 *
 * @param data - A record of key-value pairs to update in the ConfigMap and Secret.
 * @returns A promise that resolves once the configurations have been updated and the deployment restarted.
 * @example
 * cy.updateAiAssistantConfigs({ PLAN_ENABLED: 'true' });
 */
Cypress.Commands.add('updateAiAssistantConfigs', (data: Record<string, string>) => {
  const namespace = 'cattle-ai-agent-system';
  const configMapName = 'llm-config';
  const secretName = 'llm-secret';

  cy.getRancherResource('v1', 'configmaps', `${ namespace }/${ configMapName }`).then((configMapResp) => {
    const configMap = configMapResp.body;
    const configMapData = configMap.data || {};

    // Merge data for configmap
    Object.entries(data).forEach(([key, value]) => {
      if (configMapData[key] !== undefined) {
        configMapData[key] = value;
      }
    });

    const updatedConfigMap = {
      metadata: { ...configMap.metadata },
      data:     configMapData
    };

    return cy.getRancherResource('v1', 'secrets', `${ namespace }/${ secretName }`).then((secretResp) => {
      const secret = secretResp.body;
      const secretData = secret.data || {};

      cy.log(`Fetched Secret: ${ JSON.stringify(secretData) }`);

      // Merge data for secret
      Object.entries(data).forEach(([key, value]) => {
        if (secretData[key] !== undefined) {
          secretData[key] = btoa(value);
        }
      });

      const updatedSecret = {
        metadata: { ...secret.metadata },
        data:     secretData
      };

      // Update Settings
      cy.setRancherResource('v1', 'configmaps', `${ namespace }/${ configMapName }`, updatedConfigMap);
      cy.setRancherResource('v1', 'secrets', `${ namespace }/${ secretName }`, updatedSecret);

      cy.log('Updated ConfigMap and Secret');

      return resolveKubeconfig().then((kubeconfig) => {
        cy.log('Restarting rancher-ai-agent deployment...');

        const restartCmd = `kubectl rollout restart deployment/rancher-ai-agent -n cattle-ai-agent-system --kubeconfig=${ kubeconfig }`;

        cy.exec(restartCmd, {
          failOnNonZeroExit: true,
          timeout:           30000
        }).then((result) => {
          cy.log(`Deployment rollout initiated: ${ result.stdout }`);
        });

        // Wait for rollout to complete (timeout 300s)
        const waitCmd = `kubectl rollout status deployment/rancher-ai-agent -n cattle-ai-agent-system --timeout=300s --kubeconfig=${ kubeconfig }`;

        cy.log('Waiting for pod to be active...');
        cy.exec(waitCmd, {
          failOnNonZeroExit: true,
          timeout:           330000
        }).then((result) => {
          cy.log(`Pod is ready: ${ result.stdout }`);
        });

        // Wait a bit more to ensure the pod is fully ready
        cy.wait(2000);
      });
    });
  });
});
