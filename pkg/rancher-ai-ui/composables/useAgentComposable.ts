import { computed } from 'vue';
import { useStore } from 'vuex';
import { RANCHER_AI_SCHEMA } from '../product';
import { Agent, AIAgentConfigCRD } from '../types';
import { formatAgentFromCRD } from '../utils/format';
import { error } from '../utils/log';

export const DEFAULT_AI_AGENT = 'rancher';

/**
 * Composable for managing the AI agents.
 */
export function useAgentComposable(chatId: string) {
  const store = useStore();

  const agents = computed<Agent[]>(() => {
    const all: AIAgentConfigCRD[] = store.getters['management/all'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);

    return all
      .filter((crd) => crd.spec.enabled)
      .map(formatAgentFromCRD);
  });

  const agentName = computed<string>(() => store.getters['rancher-ai-ui/chat/agentName'](chatId));

  async function fetchAgents() {
    if (store.getters['management/canList'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG)) {
      // This can throw errors if called in the middle of server redeployments
      try {
        await store.dispatch('management/findAll', { type: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG });
      } catch (err) {
        error('Failed to fetch AI agents:', err);
      }
    }
  }

  function selectAgent(agentName: string) {
    store.commit('rancher-ai-ui/chat/setAgentName', {
      chatId,
      agentName,
    });
  }

  return {
    agents,
    agentName,
    fetchAgents,
    selectAgent,
  };
}
