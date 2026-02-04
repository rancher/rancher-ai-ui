#!/bin/bash

# Helpers to enable or disable db persistence in Rancher AI Agent via Helm chart.

KUBECONFIG_PATH=$1
HELM_CHART_ROOT=$2
ENABLE=$3

export KUBECONFIG="$KUBECONFIG_PATH"

helm upgrade ai-agent ${HELM_CHART_ROOT}/chart/agent \
  --namespace cattle-ai-agent-system \
  --set googleApiKey=empty \
  --set llmModel=gemini-2.0-flash \
  --set activeLlm=gemini \
  --set llmMock.enabled=true \
  --set llmMock.url=http://llm-mock \
  --set storage.enabled=${ENABLE} \
  --set storage.connectionString="postgresql://postgres:password@localhost:5432/postgres" \
  --set insecureSkipTls=true \
  --set log.level=debug \
  --wait --timeout 2m

kubectl -n cattle-ai-agent-system rollout status deployment/rancher-ai-agent --timeout=2m
kubectl -n cattle-ai-agent-system wait --for=condition=available --timeout=2m deployment/rancher-ai-agent
