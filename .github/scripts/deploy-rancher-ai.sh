#!/bin/bash

# Helper script to install the AI Assistant Helm chart into a Kubernetes cluster
#
# The LLM is configured to use a mock service for testing purposes.

KUBECONFIG_PATH=$1

if [ -z "$2" ]; then
  WAIT_FOR_AI_SERVICE_READY=true
else
  WAIT_FOR_AI_SERVICE_READY=$2
fi

if [ -z "$3" ]; then
  FETCH_REPOS=true
else
  FETCH_REPOS=$3
fi

HELM_WAIT_FLAGS=""
if [ "$WAIT_FOR_AI_SERVICE_READY" = "true" ]; then
  HELM_WAIT_FLAGS="--wait --timeout 2m"
fi

if [ -z "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig path required (arg or KUBECONFIG env)"
  usage
fi

if [ ! -f "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig not found at $KUBECONFIG_PATH"
  exit 2
fi

export KUBECONFIG="$KUBECONFIG_PATH"

helm uninstall ai-agent -n cattle-ai-agent-system || true
helm uninstall llm-mock -n cattle-ai-agent-system || true

if [ "$FETCH_REPOS" = "true" ]; then
  rm -rf rancher-ai-agent
  rm -rf rancher-ai-llm-mock

  git clone https://github.com/rancher/rancher-ai-agent.git
  git clone https://github.com/rancher-sandbox/rancher-ai-llm-mock.git
fi

helm upgrade --install llm-mock ./rancher-ai-llm-mock/chart/llm-mock \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --wait --timeout 1m

kubectl -n cattle-ai-agent-system rollout status deployment/llm-mock --timeout=1m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=1m deployment/llm-mock

helm upgrade --install ai-agent ./rancher-ai-agent/chart/agent \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --set global.cattle.systemDefaultRegistry=stgregistry.suse.com \
  --set googleApiKey=empty \
  --set ollamaUrl="http://localhost:11434" \
  --set ollamaLlmModel=ollama \
  --set activeLlm=ollama \
  --set llmMock.enabled=true \
  --set llmMock.url=http://llm-mock \
  --set insecureSkipTls=true \
  --set log.level=debug \
  $HELM_WAIT_FLAGS

if [ "$WAIT_FOR_AI_SERVICE_READY" = "true" ]; then
  kubectl -n cattle-ai-agent-system rollout status deployment/rancher-ai-agent --timeout=2m
  kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=2m deployment/rancher-ai-agent
fi
