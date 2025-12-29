#!/bin/bash

# Helper script to install the AI Assistant Helm chart into a Kubernetes cluster
#
# The LLM is configured to use a mock service for testing purposes.

KUBECONFIG_PATH=$1

if [ -z "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig path required (arg or KUBECONFIG env)"
  usage
fi

if [ ! -f "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig not found at $KUBECONFIG_PATH"
  exit 2
fi

export KUBECONFIG="$KUBECONFIG_PATH"

echo ""
echo "Cloning rancher-ai-agent chart repository..."

git clone https://github.com/rancher-sandbox/rancher-ai-agent.git

echo ""
echo "Cloning llm-mock chart repository..."

git clone https://github.com/rancher-sandbox/rancher-ai-llm-mock.git

echo ""
echo "Deploying Rancher AI Helm chart with LLM mock configuration..."

helm upgrade --install ai-agent ./rancher-ai-agent/chart/agent \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --set googleApiKey=empty \
  --set ollamaUrl="" \
  --set llmModel=gemini-2.0-flash \
  --set insecureSkipTls=true \
  --set activeLlm=gemini \
  --set awsBedrock.region=us-west-2 \
  --set awsBedrock.accessKeyId=empty \
  --set awsBedrock.secretAccessKey=empty \
  --set log.level=debug \
  --set llmMock.enabled=true \
  --set llmMock.url=http://llm-mock \
  --wait --timeout 1m

kubectl -n cattle-ai-agent-system rollout status deployment/rancher-ai-agent --timeout=1m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=1m deployment/rancher-ai-agent

echo ""
echo "Deploying LLM mock service..."

helm upgrade --install llm-mock ./rancher-ai-llm-mock/chart/llm-mock \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --wait --timeout 1m

kubectl -n cattle-ai-agent-system rollout status deployment/llm-mock --timeout=1m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=1m deployment/llm-mock