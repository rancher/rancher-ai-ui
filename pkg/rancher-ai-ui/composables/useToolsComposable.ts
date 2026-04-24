import semver from 'semver';
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { CONFIG_MAP } from '@shell/config/types';
import { AGENT_NAMESPACE, RANCHER_AI_UI_LABELS, TOOLS_CONFIG_NAME } from '../product';
import { warn } from '../utils/log';
import { getRancherVersion, uiVersion } from '../utils/version';
import { compareSpecConfig, compareSpecTools, hasChanges } from '../utils/tools';
import toolsConfigData from '../ui-tools.json';
import {
  UITool, UIToolsConfig, UIToolsConfigs, ToolsDefinitionAction, ToolsDefinitionActionResult, ToolsDefinitionActionType
} from '../types';

const RANCHER_VERSION_KEY = 'rancher-version';
const UI_VERSION_KEY = 'ui-version';

/**
 * Composable for managing the UI tools configuration and interactions.
 * @returns Composable for managing the UI tools configuration and interactions.
 */
export function useToolsComposable() {
  const store = useStore();

  const toolsConfigMap = computed(() => store.getters['management/byId'](CONFIG_MAP, `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`));

  const uiToolsDefinitionAction = ref<ToolsDefinitionAction>({ type: ToolsDefinitionActionType.None });

  /**
   * Tools selector based on the tools configuration,
   * filtering tools based on Rancher version compatibility.
   */
  const toolsSelector = computed(() => {
    // Disable tools if create or update action is needed to prevent usage of outdated tools
    if (uiToolsDefinitionAction.value.type !== ToolsDefinitionActionType.None) {
      return undefined;
    }

    let configs = {} as UIToolsConfigs;

    try {
      configs = JSON.parse(toolsConfigMap.value?.data?.config || '{}');
    } catch (err) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { err });
    }

    if (!configs.config?.enabled || !configs.tools?.length) {
      return undefined;
    }

    return {
      name:  TOOLS_CONFIG_NAME,
      tools: configs.tools
        .filter((tool: UITool) => !tool.metadata[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]))
        .map((tool: UITool) => tool.name)
    };
  });

  async function detectToolsDefinitionAction() {
    let configMap;

    // First, check if the ConfigMap exists.
    try {
      configMap = await store.dispatch('management/find', {
        type: CONFIG_MAP,
        id:   `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`
      });
    } catch (err) { // eslint-disable-line no-unused-vars
      uiToolsDefinitionAction.value.type = ToolsDefinitionActionType.Create;

      return;
    }

    // Extract current tools and config from ConfigMap data
    let configs = {} as UIToolsConfigs;

    try {
      configs = JSON.parse(configMap?.data?.config || '{}');
    } catch (err) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { err });
    }

    const {
      config: currentConfig = {} as UIToolsConfig,
      tools:  currentTools = [] as UITool[]
    } = configs;

    // Compare the current ConfigMap data with the provided toolsConfigData
    const changesDetected = hasChanges(
      toolsConfigData.tools,
      currentTools,
      toolsConfigData.config,
      currentConfig
    );

    uiToolsDefinitionAction.value.type = changesDetected ? ToolsDefinitionActionType.Update : ToolsDefinitionActionType.None;
  }

  async function publishToolsDefinition() {
    let result = {} as ToolsDefinitionActionResult;

    switch (uiToolsDefinitionAction.value.type) {
    case ToolsDefinitionActionType.Create:
      result = await createToolsDefinition();
      break;
    case ToolsDefinitionActionType.Update:
      result = await updateToolsDefinition();
      break;
    }

    uiToolsDefinitionAction.value = {
      type: result.success ? ToolsDefinitionActionType.None : uiToolsDefinitionAction.value.type,
      result
    };
  }

  async function createToolsDefinition(): Promise<ToolsDefinitionActionResult> {
    const configMap = await store.dispatch('management/create', {
      type:     CONFIG_MAP,
      metadata: {
        name:        TOOLS_CONFIG_NAME,
        namespace:   AGENT_NAMESPACE,
        labels:      { app: RANCHER_AI_UI_LABELS.UI_TOOLS },
        annotations: {
          ...(toolsConfigData.metadata?.annotations || {}),
          [UI_VERSION_KEY]: uiVersion
        }
      },
      data: {
        config: JSON.stringify({
          config: toolsConfigData.config,
          tools:  toolsConfigData.tools
        }),
      }
    });

    try {
      await configMap.save();
    } catch (err) {
      warn(`Unable to create UI Tools Config ConfigMap ${ configMap.metadata.name }: `, { err });

      return {
        action:  ToolsDefinitionActionType.Create,
        success: false,
        message: err as string
      };
    }

    return {
      action:  ToolsDefinitionActionType.Create,
      success: true,
    };
  }

  async function updateToolsDefinition(): Promise<ToolsDefinitionActionResult> {
    // Extract current tools and config from ConfigMap data (parse JSON strings)
    let configs = {} as UIToolsConfigs;

    try {
      configs = JSON.parse(toolsConfigMap.value?.data?.config || '{}');
    } catch (err) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { err });

      return {
        action:  ToolsDefinitionActionType.Update,
        success: false,
        message: err as string
      };
    }

    const {
      config: currentConfig = {} as UIToolsConfig,
      tools:  currentTools = [] as UITool[]
    } = configs;

    // Variables to track changes
    const addedTools = [];
    const updatedTools = [];
    const removedTools = [];
    const resetToolUserValues = {} as Record<string, { name: string; from: any; to: any }>;
    let updatedConfig = false;
    const resetConfigUserValues = {} as Record<string, { from: any; to: any }>;

    // Build new tools array
    const newTools: UITool[] = [];
    const currentToolsByName = Object.fromEntries(currentTools.map((t) => [t.name, t]));
    const providedToolsByName = Object.fromEntries(toolsConfigData.tools.map((t) => [t.name, t]));

    for (const tool of currentTools) {
      if (!providedToolsByName[tool.name]) {
        // Track removed tools
        removedTools.push(tool.name);
      }
    }

    for (const tool of toolsConfigData.tools) {
      if (!currentToolsByName[tool.name]) {
        // Add new tool
        newTools.push(tool);

        // Track added tools
        addedTools.push(tool.name);
      } else {
        // Track updated tools
        if (compareSpecTools(tool, currentToolsByName[tool.name])) {
          updatedTools.push(tool.name);
        }

        const toolToUpdate = {
          ...tool,
          enabled: currentToolsByName[tool.name].enabled // Preserve enabled state
        };

        // Update existing tools based on revision
        const providedToolRevision = tool.revision || 0;
        const currentToolRevision = currentToolsByName[tool.name].revision || 0;

        if (providedToolRevision > currentToolRevision) {
          if (toolToUpdate.enabled !== providedToolsByName[tool.name].enabled) {
            // Track tool updates in resetToolUserValues
            updatedTools.push(tool.name);
            resetToolUserValues[tool.name] = {
              name: 'enabled',
              from: currentToolsByName[tool.name].enabled,
              to:   providedToolsByName[tool.name].enabled
            };

            // Force enabled to be updated to the provided value since it's a new revision with changes
            toolToUpdate.enabled = providedToolsByName[tool.name].enabled;
          }
        }

        newTools.push(toolToUpdate);
      }
    }

    // Build new config - always preserve user's enabled and systemPrompt values
    const newConfig = {
      ...toolsConfigData.config,
      enabled:      currentConfig.enabled,
      systemPrompt: currentConfig.systemPrompt
    };

    // Track if config spec (excluding enabled/systemPrompt) changed
    if (compareSpecConfig(toolsConfigData.config, currentConfig)) {
      updatedConfig = true;
    }

    const providedConfigRevision = toolsConfigData.config.revision || 0;
    const currentConfigRevision = currentConfig.revision || 0;

    if (providedConfigRevision > currentConfigRevision) {
      if (newConfig.enabled !== toolsConfigData.config.enabled) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['enabled'] = {
          from: currentConfig.enabled,
          to:   toolsConfigData.config.enabled
        };

        // Force enabled to be updated to the provided value since it's a new revision with changes
        newConfig.enabled = toolsConfigData.config.enabled;
      }

      if (newConfig.systemPrompt !== toolsConfigData.config.systemPrompt) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['systemPrompt'] = {
          from: currentConfig.systemPrompt,
          to:   toolsConfigData.config.systemPrompt
        };

        // Force systemPrompt to be updated to the provided value since it's a new revision with changes
        newConfig.systemPrompt = toolsConfigData.config.systemPrompt;
      }
    }

    toolsConfigMap.value.data = {
      config: JSON.stringify({
        config: newConfig,
        tools:  newTools
      })
    };

    try {
      await toolsConfigMap.value.save();
    } catch (err) {
      warn(`Unable to update UI Tools Config ConfigMap ${ toolsConfigMap.value.metadata.name }: `, { err });

      return {
        action:  ToolsDefinitionActionType.Update,
        success: false,
        message: err as string
      };
    }

    let message = '';

    if (Object.keys(resetConfigUserValues).length > 0 || Object.keys(resetToolUserValues).length > 0) {
      if (Object.keys(resetConfigUserValues).length > 0) {
        message += `${ Object.entries(resetConfigUserValues).map(([key, { from, to }]) => `Config: ${ key } from: ${ from }, to: ${ to }`).join(';\n') }`;
      }

      if (Object.keys(resetToolUserValues).length > 0) {
        message += `${ Object.entries(resetToolUserValues).map(([toolName, { name, from, to }]) => `Tool: ${ toolName } - ${ name } from: ${ from }, to: ${ to }`).join(';\n') }`;
      }

      return {
        action:  ToolsDefinitionActionType.Update,
        success: true,
        message
      };
    }

    if (updatedConfig || updatedTools.length > 0 || removedTools.length > 0 || addedTools.length > 0) {
      message += updatedTools.length > 0 ? `Updated tools: ${ updatedTools.join(', ') }\n` : '';
      message += removedTools.length > 0 ? `Removed tools: ${ removedTools.join(', ') }\n` : '';
      message += addedTools.length > 0 ? `Added tools: ${ addedTools.join(', ') }\n` : '';

      return {
        action:  ToolsDefinitionActionType.Update,
        success: true,
        message
      };
    }

    return {
      action:  ToolsDefinitionActionType.Update,
      success: true
    };
  }

  onMounted(async() => {
    await detectToolsDefinitionAction();
  });

  return {
    toolsSelector,
    uiToolsDefinitionAction,
    publishToolsDefinition
  };
}
