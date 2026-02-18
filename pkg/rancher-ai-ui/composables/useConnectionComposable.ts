import { computed } from 'vue';
import { useStore } from 'vuex';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_WS_API_PATH } from '../product';
import { ConnectionPhase } from '../types';

/**
 * Composable for managing the AI connection state.
 *
 * The connection remains persistent across different chat sessions (closing and reopening the chat).
 *
 * Note: The connection phase is not currently handled.
 *
 * @param options Options for the connection composable.
 * @returns Composable for managing the AI connection state.
 */
export function useConnectionComposable(options: {
  onopen: (event: { target: WebSocket }) => void // eslint-disable-line no-unused-vars
  onmessage: (event: MessageEvent) => Promise<void>, // eslint-disable-line no-unused-vars
  onclose?: (event: CloseEvent) => void, // eslint-disable-line no-unused-vars
}) {
  const store = useStore();

  const ws = computed(() => store.getters['rancher-ai-ui/connection/ws']);
  const phase = computed(() => store.getters['rancher-ai-ui/connection/phase']);
  const error = computed(() => store.getters['rancher-ai-ui/connection/error']);

  const baseUrl = `wss://${ window.location.host }/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ AGENT_NAME }:80/proxy/${ AGENT_WS_API_PATH }`;

  async function connect(chatId?: string | null) {
    const url = chatId ? `${ baseUrl }/${ chatId }` : baseUrl;

    const { onopen, onmessage, onclose } = options;

    await store.dispatch('rancher-ai-ui/connection/open', {
      url,
      onopen,
      onmessage,
      onclose,
    });
  }

  function disconnect(phase?: ConnectionPhase) {
    store.commit('rancher-ai-ui/connection/close', { phase });
  }

  function setPhase(phase: ConnectionPhase) {
    store.commit('rancher-ai-ui/connection/setPhase', phase);
  }

  return {
    ws,
    phase,
    error,
    connect,
    disconnect,
    setPhase
  };
}
