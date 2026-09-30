# rancher-ai-ui

The Rancher AI UI extension adds an AI-powered chat assistant directly into the Rancher Dashboard.

It helps users interact with clusters and workloads using conversational queries and suggested actions — improving discoverability, troubleshooting, and automation.

It also adds direct links in the Rancher UI to the Chat, available on resource lists, resource detail pages and the global navigation — making it quick to start a conversation about any cluster object or action.

Key features
- Conversational assistant integrated into Rancher UI
- Actionable suggestions and templates to speed common workflows
- Support for configurable LLM backends (local or remote)

## Running for Development
This is what you probably want to get started.
```bash
# Install dependencies
yarn install

# For development, serve with hot reload at https://localhost:8005
# using the endpoint for your Rancher API
API=https://your-rancher yarn dev
# or put the variable into a .env file
# Goto https://localhost:8005
```

## Updating @shell package
This is about updating the @shell package which is the base from rancher/dashboard
```bash
# Update
yarn create @rancher/update
```

## Building the extension for production
Bump the app version on `package.json` file, then run:
```bash
# Build for production
./scripts/publish -g 
# add flag -f if you need to overwrite an existing version


# If you need to test the built extension
yarn serve-pkgs
```

## E2E tests

#### Install Rancher

Two setups are available:

```bash
# Docker - a single all-in-one container, serving the UI from `yarn dev`. Handy for local development.
./.github/scripts/install-rancher-docker.sh

# Helm on k3s - Rancher installed on a real k3s cluster, serving its own dashboard with the
# extension developer-loaded into it (same-origin, no dev proxy). This is what CI runs.
./.github/scripts/install-rancher-helm.sh
```

Both write a kubeconfig for the cluster to `./kubeconfig.yaml`.

The Helm setup takes the Rancher chart channel and the k3s version as parameters, both defaulting
to `latest`:

```bash
# Usage: install-rancher-helm.sh [VERSION] [CATTLE_SERVER_URL] [CATTLE_BOOTSTRAP_PASSWORD] \
#                                [RANCHER_CHART_CHANNEL] [K3S_VERSION]
./.github/scripts/install-rancher-helm.sh head https://127.0.0.1.sslip.io password release-2.15 v1.36.1+k3s1
```

With the Helm setup, the extension is loaded from a local catalog server rather than `yarn dev`:

```bash
yarn build-pkg rancher-ai-ui
./.github/scripts/start-extension-server.sh          # serve-pkgs on :8080
./.github/scripts/register-extension.sh 8080 ./kubeconfig.yaml
```

#### Install AI Agent chart

This will install the AI Agent Helm chart into your Kubernetes cluster.
The LLM is configured to use a mock service for testing purposes.

```bash
./.github/scripts/deploy-rancher-ai.sh $YOUR_KUBECONFIG_PATH
```

#### Launch UI in dev mode

Only needed for the Docker setup - with the Helm setup Rancher serves the UI itself.

```bash
API=https://your-rancher yarn dev
```

#### Launch Cypress

```bash
# Launch Cypress dashboard - interactive mode
TEST_SKIP=setup,global-ui TEST_PASSWORD=${rancher-password} KUBECONFIG_PATH=$YOUR_KUBECONFIG_PATH yarn cypress:open

# Run Cypress tests in background
TEST_SKIP=setup,global-ui TEST_PASSWORD=${rancher-password} KUBECONFIG_PATH=$YOUR_KUBECONFIG_PATH yarn cypress:run
```

#### Environment variables
- `API`, the address of your Rancher instance.
- `TEST_USERNAME`, default `admin`.
- `TEST_PASSWORD`, user password or custom during first Rancher run.
- `CATTLE_BOOTSTRAP_PASSWORD`, initialization password.
- `TEST_BASE_URL`, Rancher UI URL. Default `https://localhost:8005` (`yarn dev`); with the Helm
  setup point it at Rancher's own dashboard, e.g. `https://127.0.0.1.sslip.io/dashboard`.
- `KUBECONFIG_PATH`, path to a kubeconfig with direct access to the cluster. The AI service
  install/uninstall commands use it instead of Rancher's `generateKubeconfig` action, which is
  required for `helm uninstall` to actually tear the agent down. Optional - falls back to
  `generateKubeconfig` when unset.
- `TEST_SKIP=setup,global-ui`, avoid to execute bootstrap setup tests for already initialized Rancher instances and global UI tests, it has to be toggled in case of new instances


License
=======
Check Rancher AI UI Apache License details [here](LICENSE)
