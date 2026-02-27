import { IPlugin } from '@shell/core/types';
import { RIGHT } from '@shell/utils/position';

export const PRODUCT_NAME = 'rancher-ai-ui';
export const BLANK_CLUSTER = '_';

export const AGENT_NAMESPACE = 'cattle-ai-agent-system';
export const AGENT_NAME = 'rancher-ai-agent';
export const AGENT_WS_API_PATH = 'v1/ws/messages';
export const AGENT_REST_API_PATH = 'v1/api';

export const AGENT_CONFIG_SECRET_NAME = 'llm-secret';
export const AGENT_CONFIG_CONFIG_MAP_NAME = 'llm-config';

export const PANEL_POSITION = RIGHT;

export function init($plugin: IPlugin, store: any) {
  // Configure Settings page to include AI Assistant settings
  const {
    basicType,
    mapGroup,
    virtualType,
  } = $plugin.DSL(store, 'settings');

  basicType([PRODUCT_NAME]);

  virtualType({
    label:      'AI Assistant',
    name:       PRODUCT_NAME,
    namespaced: false,
    route:      { name: `c-cluster-settings-${ PRODUCT_NAME }` }
  });

  // Configure Rancher AI group
  mapGroup('ai.cattle.io', 'Rancher AI');
}