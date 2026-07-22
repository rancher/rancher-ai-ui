#!/bin/bash

# Helper script to uninstall the Elemental Operator Helm chart from a Kubernetes cluster

KUBECONFIG_PATH=$1

HELM_WAIT_FLAGS="--wait --timeout 5m"

if [ -z "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig path required (arg or KUBECONFIG env)"
  usage
fi

if [ ! -f "$KUBECONFIG_PATH" ]; then
  echo "ERROR: kubeconfig not found at $KUBECONFIG_PATH"
  exit 2
fi

export KUBECONFIG="$KUBECONFIG_PATH"

helm uninstall elemental-operator-crds -n cattle-elemental-system $HELM_WAIT_FLAGS || true
helm uninstall elemental-operator -n cattle-elemental-system $HELM_WAIT_FLAGS || true
