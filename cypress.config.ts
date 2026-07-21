import { extendConfig } from '@rancher/cypress/extend-config';

export default extendConfig({
  // The extension catalog server (serve-pkgs) is plain http on :8080 while the dashboard is
  // https; disabling web security lets the developer-loaded extension script load.
  chromeWebSecurity: false,
  env:               {
    // Direct k3s kubeconfig path (set in CI). When present, the AI-service install/uninstall
    // commands use it instead of Rancher's generateKubeconfig action - see resolveKubeconfig.
    kubeconfig:   process.env.KUBECONFIG_PATH,
    helmChartDir: './rancher-ai-agent',
    llmMockServiceProxyPath: '/api/v1/namespaces/cattle-ai-agent-system/services/http:llm-mock:80/proxy',
    chatServiceProxyPath: '/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-agent:80/proxy/v1/api'
  },
  e2e: { supportFile: 'cypress/support/e2e.ts' }
});
