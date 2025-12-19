#!/bin/bash

# Helper script to install the AI Assistant Helm chart into a Kubernetes cluster

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
echo "Installing ai-agent"

helm upgrade --install ai-agent ./rancher-ai-agent/chart/agent \
  --namespace cattle-ai-agent-system \
  --create-namespace \
  --set "imagePullSecrets[0].name=gh-secret" \
  --set llmModel=gemini-2.0-flash \
  --set googleApiKey=your_token \
  --set insecureSkipTls=true \
  --set activeLlm=gemini \
  --wait --timeout 1m

kubectl -n cattle-ai-agent-system rollout status deployment/rancher-ai-agent --timeout=1m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=1m deployment/rancher-ai-agent