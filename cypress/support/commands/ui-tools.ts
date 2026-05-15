import createDefinition from '../../../pkg/rancher-ai-ui/ui-tools.json';
import updateDefinition from '../../e2e/blueprints/ui-tools/update.json';

const AGENT_NAMESPACE = 'cattle-ai-agent-system';
const TOOLS_CONFIG_NAME = 'rancher-ai-ui';

const RANCHER_AI_UI_LABELS = { UI_TOOLS: 'rancher-ai-ui-tools' };
const UI_VERSION_KEY = 'ui-version';

/**
 * Installs the UI tools definition by creating a ConfigMap in the cluster with the necessary configuration for the UI tools.
 *
 * @return void
 */
Cypress.Commands.add('installUIToolsDefinition', () => {
  const configMap = {
    metadata: {
      name:        TOOLS_CONFIG_NAME,
      namespace:   AGENT_NAMESPACE,
      labels:      { app: RANCHER_AI_UI_LABELS.UI_TOOLS },
      annotations: {
        ...(createDefinition.metadata?.annotations || {}),
        [UI_VERSION_KEY]: '1.0.0'
      }
    },
    data: {
      config: JSON.stringify({
        config: createDefinition.config,
        tools:  createDefinition.tools
      }),
    }
  };

  cy.createRancherResource('v1', 'configmaps', configMap, false);
});

/**
 * Updates the UI tools definition by patching the existing ConfigMap in the cluster with the new configuration for the UI tools.
 *
 * @return void
 */
Cypress.Commands.add('updateUIToolsDefinition', () => {
  const id = `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`;

  cy.getRancherResource('v1', 'configmaps', id).then((resp) => {
    const updatedConfig = {
      metadata: { ...resp.body.metadata },
      data:     {
        config: JSON.stringify({
          config: updateDefinition.config,
          tools:  updateDefinition.tools
        }),
      }
    };

    cy.setRancherResource('v1', 'configmaps', id, updatedConfig);
  });
});

/**
 * Uninstalls the UI tools definition by deleting the ConfigMap from the cluster.
 *
 * @return void
 */
Cypress.Commands.add('uninstallUIToolsDefinition', () => {
  cy.deleteRancherResource('v1', 'configmaps', `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`, false);
});