import { LlmResponseArgs } from '@/cypress/globals';

/**
 * Enqueue a response to be sent by the llm mock service.
 *
 * @param args - The arguments for the LLM response.
 *
 * arg.agent (Optional)
 *   This agent will be selected by the AI service in Adaptive Mode.
 *    - If not provided, the default agent will be used (rancher).
 *    - If provided, the specified agent will be used when Adaptive Mode is enabled.
 *   Note: This parameter must be omitted when multiple agents are not configured or there is only 1 agent enabled and active.
 *         This parameter must be Null when the Agent is selected by Manual Mode.
 *
 * arg.text (Optional)
 *   The text content to be received. Can be a string or an array of strings (chunks).
 *   If not provided, default text will be returned by the llm mock service.
 *
 * arg.chunkSize (Optional)
 *   The size of each chunk if text is a single string.
 *   If not provided or less than or equal to 0, the entire text will be sent as a single chunk.
 * 
 * arg.uiTools (Optional)
 *  The UI tools to be rendered in the UI. It can be used to simulate the rendering of UI tools and verify their behavior during tests.
 *
 *  Usage example:
 *
 *    - Suggestions:
 *
 *      uiTools: [
 *        {
 *          name: 'suggestions',
 *          args: {
 *            suggestion1: 'View resources',
 *            suggestion2: 'Analyze logs',
 *            suggestion3: 'Do action',
 *          }
 *        }
 *      ]
 * 
 *
 * arg.tool (Optional)
 *   The tool to be used by the Rancher AI agent to request cluster resources to the MCP. It can be used to simulate resource fetching during tests and confirmation behavior.
 *   The list of available MCP tool can be found here: https://github.com/rancher-sandbox/rancher-ai-mcp/blob/main/README.md
 *
 *   Usage example:
 *
 *     - Fetch Kubernetes resources:
 *
 *        Tool definition in MCP service:
 *
 * 		      Name: "getKubernetesResource",
 *          Description: `Fetches a Kubernetes resource from the cluster.
 *          Parameters:
 *            name (string, required): The name of the Kubernetes resource.
 *            kind (string, required): The kind of the Kubernetes resource (e.g. 'Deployment', 'Service').
 *            cluster (string): The name of the Kubernetes cluster managed by Rancher.
 *            namespace (string, optional): The namespace of the resource. It must be empty for all namespaces or cluster-wide resources.
 *
 *        Enqueueing a response with tool usage in Cypress test:
 *
 *          tool: {
 *            name: "getKubernetesResource",
 *            args: {
 *              name: "my-deployment",
 *              kind: "Deployment",
 *              cluster: "my-cluster",
 *              namespace: "default"
 *            }
 *          }
 *
 *     - Create Kubernetes resources:
 *
 *        Tool definition in MCP service:
 *
 * 		      Name: "createKubernetesResource",
 *          Description: `Creates a Kubernetes resource in the cluster.
 *          Parameters:
 *            name (string, required): The name of the Kubernetes resource.
 *            kind (string, required): The kind of the Kubernetes resource (e.g. 'Deployment', 'Service').
 *            cluster (string): The name of the Kubernetes cluster managed by Rancher.
 *            namespace (string, optional): The namespace of the resource. It must be empty for all namespaces or cluster-wide resources.
 *            resource (object, required): The Kubernetes resource manifest to be created in the cluster.
 *
 *        Enqueueing a response with tool usage in Cypress test:
 *
 *          tool: {
 *            name: "createKubernetesResource",
 *            args: [
 *              {
 *                name: "my-deployment-1",
 *                kind: "Deployment",
 *                cluster: "my-cluster",
 *                namespace: "default",
 *                resource: {
 *                  apiVersion: "apps/v1",
 *                  metadata: { ... },
 *                }
 *              },
*               {
 *                name: "my-deployment-2",
 *                kind: "Deployment",
 *                cluster: "my-cluster",
 *                namespace: "default",
 *                resource: {
 *                  apiVersion: "apps/v1",
 *                  metadata: { ... },
 *                }
 *              },
 *            ]
 *          }
 *
 *
 * @return void
 */
Cypress.Commands.add('enqueueLLMResponse', (args: LlmResponseArgs) => {
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

  // We are in a multi-agent environment, select the default agent if not specified.
  const agent = args.agent === undefined ? 'rancher' : args.agent;
  const text = chunks.length > 0 ? { chunks } : undefined;
  const tool = args.tool;
  const uiTools = args.uiTools || [];

  return cy.getCookie('R_SESS').then((token) => {
    cy.request({
      method:  'POST',
      url:     `${ Cypress.env('llmMockServiceProxyPath') }/v1/control/push`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie':       `R_SESS=${ token?.value }`,
      },
      body: {
        agent,
        text,
        tool,
        uiTools
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
