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

#### Install AI Agent chart

This will install the AI Agent Helm chart into your Kubernetes cluster.
The LLM is configured to use a mock service for testing purposes.

```bash
./.github/scripts/deploy-rancher-ai.sh $YOUR_KUBECONFIG_PATH
```

#### Launch UI in dev mode

```bash
API=https://your-rancher yarn dev
```

#### Launch Cypress

```bash
# Launch Cypress dashboard - interactive mode
TEST_SKIP=setup TEST_PASSWORD=${rancher-password} yarn cypress:open

# Run Cypress tests in background
TEST_SKIP=setup TEST_PASSWORD=${rancher-password} yarn cypress:run
```

#### Environment variables
- `API`, the address of your Rancher instance.
- `TEST_USERNAME`, default `admin`.
- `TEST_PASSWORD`, user password or custom during first Rancher run.
- `CATTLE_BOOTSTRAP_PASSWORD`, initialization password.
- `TEST_BASE_URL`, Rancher UI dev URL, default `https://localhost:8005`.
- `TEST_SKIP=setup`, avoid to execute bootstrap setup tests for already initialized Rancher instances, it has to be toggled in case of new instances


License
=======
Check Rancher AI UI Apache License details [here](LICENSE)
