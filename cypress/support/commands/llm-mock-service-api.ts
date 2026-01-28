import { McpTool } from '../../globals';

/**
 * Enqueue a response to be sent by the llm mock service.
 *
 * @param args - The arguments for the LLM response.
 *
 * arg.text (Optional)
 *   The text content to be received. Can be a string or an array of strings (chunks).
 *   If not provided, default text will be returned by the llm mock service.
 *
 * arg.chunkSize (Optional)
 *   The size of each chunk if text is a single string.
 *   If not provided or less than or equal to 0, the entire text will be sent as a single chunk.
 *
 * arg.tool (Optional)
 *   The tool to be used by the Agent to request cluster resources to the MCP. It can be used to simulate resource fetching during tests and confirmation behavior.
 *   The list of available MCP tool can be found here: https://github.com/rancher-sandbox/rancher-ai-mcp/blob/main/README.md
 *
 *   Usage example:
 *
 *      Tool definition in MCP service:
 *
 * 		    Name: "getKubernetesResource",
 *        Description: `Fetches a Kubernetes resource from the cluster.
 *        Parameters:
 *        name (string, required): The name of the Kubernetes resource.
 *        kind (string, required): The kind of the Kubernetes resource (e.g. 'Deployment', 'Service').
 *        cluster (string): The name of the Kubernetes cluster managed by Rancher.
 *        namespace (string, optional): The namespace of the resource. It must be empty for all namespaces or cluster-wide resources.
 *
 *      Enqueueing a response with tool usage in Cypress test:
 *
 *        tool: {
 *          name: "getKubernetesResource",
 *          args: {
 *            name: "my-deployment",
 *            kind: "Deployment",
 *            cluster: "my-cluster",
 *            namespace: "default"
 *          }
 *        }
 *
 * @return void
 */
Cypress.Commands.add('enqueueLLMResponse', (args: { text?: string | string[], chunkSize?: number, tool?: McpTool }) => {
  let chunks: string[] = [];

  if (args.text) {
    // If content is already an array of chunks, use it as is
    if (Array.isArray(args.text)) {
      chunks = args.text;

    // Split the content into chunks of specified size
    } else if (args.chunkSize && args.chunkSize > 0) {
      for (let i = 0; i < args.text.length; i += args.chunkSize) {
        chunks.push(args.text.slice(i, i + args.chunkSize));
      }

    // Use the whole content as a single chunk
    } else {
      chunks = [args.text];
    }
  }

  const text = chunks.length > 0 ? { chunks } : undefined;
  const tool = args.tool;

  return cy.getCookie('R_SESS').then((token) => {
    cy.request({
      method:  'POST',
      url:     `${ Cypress.env('llmMockServiceProxyPath') }/v1/control/push`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie':       `R_SESS=${ token?.value }`,
      },
      body: {
        text,
        tool
      },
    })
      .then((resp) => {
        expect(resp.status).to.eq(204);
      });
  });
});

/**
 * Clear all enqueued LLM responses from the mock service.
 *
 * @return void
 */
Cypress.Commands.add('clearLLMResponses', () => {
  return cy.getCookie('R_SESS').then((token) => {
    cy.request({
      method:  'POST',
      url:     `${ Cypress.env('llmMockServiceProxyPath') }/v1/control/clear`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie':       `R_SESS=${ token?.value }`,
      },
    })
      .then((resp) => {
        expect(resp.status).to.eq(204);
      });
  });
});
