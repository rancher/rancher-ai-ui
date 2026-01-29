import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { Agent, AIAgentConfigCRD, RANCHER_AI } from '../types';
import { formatAgentFromCRD } from '../utils/format';

/**
 * Composable for managing the AI agents.
 */
export function useAgentComposable(chatId: string) {
  const store = useStore();

  const agents = computed<Agent[]>(() => {
    const all: AIAgentConfigCRD[] = store.getters['management/all'](RANCHER_AI.AI_AGENT_CONFIG);

    return all.map(formatAgentFromCRD);
  });

  const agentName = computed<string>(() => store.getters['rancher-ai-ui/chat/agentName'](chatId));

  async function fetchAgents() {
    await store.dispatch('management/findAll', { type: RANCHER_AI.AI_AGENT_CONFIG });
  }

  function selectAgent(agentName: string) {
    store.commit('rancher-ai-ui/chat/setAgentName', {
      chatId,
      agentName,
    });
  }

  onMounted(() => {
    fetchAgents();
  });

  return {
    agents,
    selectAgent,
    agentName,
  };
}
