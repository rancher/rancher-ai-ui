import { IPlugin } from '@shell/core/types';
import { RIGHT } from '@shell/utils/position';

export const PRODUCT_NAME = 'rancher-ai-ui';
export const BLANK_CLUSTER = '_';

export const AGENT_NAMESPACE = 'cattle-ai-agent-system';
export const AGENT_NAME = 'rancher-ai-agent';
export const AGENT_API_PATH = 'agent/ws/messages';

export const AGENT_CONFIG_SECRET_NAME = 'llm-config';

export const CHAT_HISTORY_SERVICE_NAME = 'rancher-ai-chat';

export const PANEL_POSITION = RIGHT;

export function init($plugin: IPlugin, store: any) {
  // Configure Settings page to include AI Assistant settings
  const { virtualType, basicType } = $plugin.DSL(store, 'settings');

  basicType([PRODUCT_NAME]);

  virtualType({
    label:      'AI Assistant',
    name:       PRODUCT_NAME,
    namespaced: false,
    route:      { name: `c-cluster-settings-${ PRODUCT_NAME }` }
  });
}