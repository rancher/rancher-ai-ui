import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { ConnectionError, ConnectionParams, ConnectionPhase } from '../types';
import { isManualDisconnect, MANUAL_DISCONNECT } from '../utils/ws';

/**
 * Manages the state of WebSocket connections within the Rancher AI UI.
 */

interface State {
  ws: WebSocket | null;
  phase: ConnectionPhase;
  error: ConnectionError | null;
}

const getters = {
  ws:    (state: State) => state.ws,
  phase: (state: State) => state.phase,
  error: (state: State) => state.error,
};

const mutations = {
  open(state: State, ws: WebSocket) {
    if (state.ws) {
      return;
    }
    state.ws = ws;

    state.phase = ConnectionPhase.Idle;
  },
  setPhase(state: State, phase: ConnectionPhase) {
    state.phase = phase;
  },
  send(state: State, message: string) {
    if (state.ws) {
      state.ws.send(message);
    }
  },
  close(state: State, { phase }: { phase: ConnectionPhase } = { phase: ConnectionPhase.Disconnected }) {
    if (state.ws) {
      state.phase = phase;

      state.ws.close(...MANUAL_DISCONNECT);
    }
  },
  setError(state: State, error: ConnectionError | null) {
    state.error = error;
  },
};

const actions = {
  async open({ commit, state }: { commit: Function, state: State }, params: ConnectionParams) {
    if (state.ws) {
      return;
    }

    const {
      url, onopen, onmessage, onclose
    } = params;

    try {
      const ws = new WebSocket(url);

      ws.onopen = (e) => {
        commit('open', ws);
        if (onopen) {
          onopen(e);
        }
      };

      ws.onmessage = onmessage || null;
      ws.onclose = (e) => {
        if (!isManualDisconnect(e)) {
          state.phase = ConnectionPhase.ConnectionClosed;
        }

        if (onclose) {
          onclose(e);
        }

        state.ws = null;
      };
      ws.onerror = (e) => {
        // eslint-disable-next-line no-console
        console.error('WebSocket error: ', e);
        commit('setError', { key: 'ai.error.websocket.generic' });
      };

      commit('setError', null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('WebSocket connection error: ', e);
      commit('setError', { key: 'ai.error.websocket.connection' } );
    }
  },
};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return {
        ws:    null,
        phase: ConnectionPhase.Idle,
        error: null
      };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};
const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/connection` };

export default {
  specifics: factory(),
  config
};