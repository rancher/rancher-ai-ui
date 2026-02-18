export const rancherAgentConfig = {
  apiVersion: 'ai.cattle.io/v1alpha1',
  kind:       'AIAgentConfig',
  metadata:   {
    name:      'rancher',
    namespace: 'cattle-ai-agent-system',
  },
  spec: { mcpURL: 'rancher-mcp-server.cattle-ai-agent-system.svc' }
};

export const harvesterAgentConfig = {
  apiVersion: 'ai.cattle.io/v1alpha1',
  kind:       'AIAgentConfig',
  metadata:   {
    name:      'harvester',
    namespace: 'cattle-ai-agent-system',
  },
  spec: {
    authenticationType: 'RANCHER',
    builtIn:            true,
    description:        'Harvester agent description',
    displayName:        'Harvester',
    enabled:            true,
    mcpURL:             'rancher-mcp-server.cattle-ai-agent-system.svc',
    systemPrompt:       'Harvester system prompt',
    toolSet:            'harvester'
  }
};

export const invalidAgentConfig = {
  apiVersion: 'ai.cattle.io/v1alpha1',
  kind:       'AIAgentConfig',
  metadata:   {
    name:      'invalid-agent',
    namespace: 'cattle-ai-agent-system',
  },
  spec: {
    authenticationType: 'RANCHER',
    builtIn:            false,
    description:        'Invalid agent description',
    displayName:        'Invalid Agent',
    enabled:            true,
    mcpURL:             'invalid-mcp-url',
    systemPrompt:       'Invalid agent system prompt',
    toolSet:            'harvester'
  }
};