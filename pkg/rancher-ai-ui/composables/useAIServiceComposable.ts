import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { warn } from '../utils/log';
import { AGENT_NAMESPACE, AGENT_NAME, AGENT_CONFIG_CONFIG_MAP_NAME, PERMISSIONS_DOCS_URL } from '../product';
import { CONFIG_MAP, WORKLOAD_TYPES } from '@shell/config/types';
import { AIServiceState, ChatError, LLMConfig } from '../types';

/**
 * Composable for fetching AI service configuration and monitoring the AI agent state.
 *
 * The AI agent's deployment state is monitored to determine if the AI service is available.
 *  - If the deployment is not found, an error is set indicating that the service is unavailable.
 *  - If the deployment exists, the llm-config configMap is fetched to determine the active LLM and model being used.
 *
 * The activeLlm and model are used to show the "{llm} ({model})" label in the Chat panel.
 *
 * @returns Composable for managing the AI service configuration.
 */
export function useAIServiceComposable() {
  const store = useStore();
  const { t } = useI18n(store);

  const initiated = ref(false);
  const llmConfig = ref<LLMConfig | null>(null);
  const error = ref<ChatError | null>(null);

  const hasPermissions = computed(() => {
    const canListDeployments = !!store.getters['management/canList'](WORKLOAD_TYPES.DEPLOYMENT);
    const canListConfigMaps = !!store.getters['management/canList'](CONFIG_MAP);

    return canListDeployments && canListConfigMaps;
  });

  const aiAgentDeploymentState = computed(() => {
    if (!hasPermissions.value) {
      return undefined;
    }

    const deployments = store.getters['management/all'](WORKLOAD_TYPES.DEPLOYMENT);

    const deployment = deployments.find((d: any) => d.metadata?.name === AGENT_NAME && d.metadata?.namespace === AGENT_NAMESPACE);

    if (!initiated.value) {
      return undefined;
    }

    if (!deployment) {
      return AIServiceState.NotFound;
    }

    return deployment?.state;
  });

  function decodeLLMConfig(configMapData: any): LLMConfig {
    const { ACTIVE_LLM: activeLlm } = configMapData;
    const activeModel = decodeModel(configMapData, activeLlm);

    return {
      name:  activeLlm ? t(`ai.configurations.models.${ activeLlm }`) : '',
      model: activeModel
    };
  }

  function decodeModel(configMapData: any, activeLLM: string | null) {
    let model = '';

    try {
      if (activeLLM) {
        const modelKey = `${ activeLLM.toUpperCase() }_MODEL`;

        model = configMapData[modelKey] || '';
      }
    } catch (err) {
      warn(`Error decoding model for ${ activeLLM }:`, err);
    }

    return model;
  }

  async function fetchLLMConfigs() {
    if (!hasPermissions.value) {
      error.value = {
        key:         'ai.error.services.settings.noPermission',
        sourceLinks: [{
          label: t('ai.error.services.docsLinkLabel'),
          value: PERMISSIONS_DOCS_URL
        }]
      };

      return;
    }

    let configMap;

    try {
      configMap = await store.dispatch('management/find', {
        type:    CONFIG_MAP,
        id:      `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`
      });
    } catch (e) {
      warn('Error fetching llm-config config map:', e);
    }

    if (!configMap) {
      error.value = { key: 'ai.error.services.settings.missingConfig' };

      return;
    }

    const config = decodeLLMConfig(configMap.data || {});

    if (!config.name) {
      error.value = { key: 'ai.error.services.settings.missingActiveLLM' };

      return;
    }

    if (!config.model) {
      error.value = { key: 'ai.error.services.settings.missingModel' };

      return;
    }

    llmConfig.value = config;
  }

  async function fetchDeployments() {
    if (hasPermissions.value) {
      await store.dispatch('management/findAll', { type: WORKLOAD_TYPES.DEPLOYMENT });
    }
  }

  watch(() => aiAgentDeploymentState.value, (newState) => {
    if (newState === AIServiceState.NotFound) {
      error.value = { key: 'ai.error.services.deployment.notFound' };
    } else {
      error.value = null;

      fetchLLMConfigs();
    }
  });

  onMounted(async() => {
    await fetchDeployments();

    initiated.value = true;
  });

  return {
    hasPermissions,
    aiAgentDeploymentState,
    llmConfig,
    error,
  };
}
