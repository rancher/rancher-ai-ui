import { extendConfig } from '@rancher/cypress/extend-config';

export default extendConfig({
  env: {
    mockAgentApi: 'http://localhost:8000',
  },
  e2e: {
    supportFile: 'cypress/support/e2e.ts'
  }
});