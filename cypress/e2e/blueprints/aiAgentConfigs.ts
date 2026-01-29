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