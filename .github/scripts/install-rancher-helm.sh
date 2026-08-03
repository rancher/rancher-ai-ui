#!/bin/bash

# Install Rancher on a local k3s cluster via Helm, then bootstrap it. This is what CI runs;
# see install-rancher-docker.sh for the all-in-one container setup used for local development.
#
# Unlike the Docker setup, this serves the *stock* Rancher dashboard (never overridden). The
# rancher-ai-ui extension is loaded into it dynamically at test time (developer load from an
# external extension server), mirroring rancher/dashboard's Extension Compatibility test.
#
# Usage: install-rancher-helm.sh [VERSION] [CATTLE_SERVER_URL] [CATTLE_BOOTSTRAP_PASSWORD] \
#                                [RANCHER_HELM_REPO_URL] [K3S_VERSION]
#
#   VERSION               Rancher image tag, default `head`.
#   RANCHER_HELM_REPO_URL Rancher Helm repo URL, default `https://charts.optimus.rancher.io/server-charts/<RANCHER_CHART_CHANNEL>`.
#                         Also accepts a release branch, e.g. `release-2.15`.
#   K3S_VERSION           k3s version to install, default `latest` (the k3s stable channel).
#                         Also accepts a pinned version, e.g. `v1.36.1+k3s1`.
#
# On success a kubeconfig for the k3s cluster is written to ./kubeconfig.yaml.

set -e

VERSION="head"
CATTLE_SERVER_URL="https://127.0.0.1.sslip.io"
CATTLE_BOOTSTRAP_PASSWORD="password"
RANCHER_HELM_REPO_URL="${RANCHER_HELM_REPO_URL:-https://charts.optimus.rancher.io/server-charts/latest}"
K3S_VERSION="${K3S_VERSION:-latest}"

if [ -n "$1" ]; then VERSION=$1; fi
if [ -n "$2" ]; then CATTLE_SERVER_URL="$2"; fi
if [ -n "$3" ]; then CATTLE_BOOTSTRAP_PASSWORD="$3"; fi
if [ -n "$4" ]; then RANCHER_HELM_REPO_URL="$4"; fi
if [ -n "$5" ]; then K3S_VERSION="$5"; fi

# ---------------------------------
# ----------------------- Config
# ---------------------------------

RANCHER_HELM_REPO_NAME=rancher-helm
RANCHER_NAMESPACE=cattle-system

RANCHER_IMG_REGISTRY=${RANCHER_IMG_REGISTRY:-}
RANCHER_IMG_REPO=${RANCHER_IMG_REPO:-rancher/rancher}
RANCHER_IMG_TAG=${RANCHER_IMG_TAG:-$VERSION}
RANCHER_AGENT_IMG=${RANCHER_AGENT_IMG:-rancher/rancher-agent:$VERSION}
RANCHER_AUDIT_LOG_LEVEL=3

# Bare hostname Rancher advertises (server-url / cert CN). No scheme.
DASHBOARD_URL="${CATTLE_SERVER_URL#https://}"
KUBECONFIG_PATH="$(pwd)/kubeconfig.yaml"

echo "--------------------------------------"
echo "Installing Rancher (Helm on k3s):"
echo "  K3S_VERSION:           ${K3S_VERSION}"
echo "  RANCHER_HELM_REPO_URL: ${RANCHER_HELM_REPO_URL}"
echo "  RANCHER_IMG_REPO:      ${RANCHER_IMG_REPO}"
echo "  RANCHER_IMG_TAG:       ${RANCHER_IMG_TAG}"
echo "  RANCHER_AGENT_IMG:     ${RANCHER_AGENT_IMG}"
echo "  CATTLE_SERVER_URL:     ${CATTLE_SERVER_URL}"
echo "--------------------------------------"

# ---------------------------------
# ----------------------- k3s + helm
# ---------------------------------

echo ""
echo "Installing k3s (${K3S_VERSION}) ..."
curl -sfL -o k3s-script https://get.k3s.io
chmod +x k3s-script
if [ "$K3S_VERSION" = "latest" ]; then
  INSTALL_K3S_CHANNEL=latest sh k3s-script
else
  INSTALL_K3S_VERSION="$K3S_VERSION" sh k3s-script
fi

export KUBECONFIG="$KUBECONFIG_PATH"
sudo k3s kubectl config view --raw > "$KUBECONFIG"
sudo chown "$(id -u):$(id -g)" "$KUBECONFIG"
chmod 600 "$KUBECONFIG"

kubectl wait --for=condition=Ready node --all --timeout=120s

if ! command -v helm >/dev/null 2>&1; then
  echo ""
  echo "Installing helm ..."
  curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
  chmod 700 get_helm.sh
  ./get_helm.sh
fi

# ---------------------------------
# ----------------------- cert-manager + Rancher
# ---------------------------------

echo ""
echo "Installing cert-manager ..."
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.7.1/cert-manager.crds.yaml
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.7.1 \
  --wait --timeout 5m

echo ""
echo "Installing Rancher ..."
helm repo add $RANCHER_HELM_REPO_NAME $RANCHER_HELM_REPO_URL
helm repo update
kubectl create namespace $RANCHER_NAMESPACE
helm install rancher $RANCHER_HELM_REPO_NAME/rancher \
  --namespace $RANCHER_NAMESPACE \
  --devel \
  --set hostname=$DASHBOARD_URL \
  --set replicas="1" \
  --set systemDefaultRegistry=$RANCHER_IMG_REGISTRY \
  --set image.repository="$RANCHER_IMG_REPO" \
  --set image.tag="$RANCHER_IMG_TAG" \
  --set image.pullPolicy="Always" \
  --set auditLog.enabled=true \
  --set auditLog.level=$RANCHER_AUDIT_LOG_LEVEL \
  --set extraEnv\[0\].name="CATTLE_AGENT_IMAGE" \
  --set-string extraEnv\[0\].value="$RANCHER_AGENT_IMG" \
  --set extraEnv\[1\].name="CATTLE_UI_OFFLINE_PREFERRED" \
  --set-string extraEnv\[1\].value="true" \
  --set extraEnv\[2\].name="CATTLE_BOOTSTRAP_PASSWORD" \
  --set-string extraEnv\[2\].value="$CATTLE_BOOTSTRAP_PASSWORD" \
  --set extraEnv\[3\].name="CATTLE_PASSWORD_MIN_LENGTH" \
  --set-string extraEnv\[3\].value="3"

echo ""
echo "Waiting for Rancher to come up ..."
kubectl -n $RANCHER_NAMESPACE rollout status deploy/rancher --timeout=10m

echo ""
echo "Waiting for the dashboard to be reachable at ${CATTLE_SERVER_URL}/dashboard/ ..."
TIME=0
until echo "200 301 302" | grep -qw "$(curl --insecure -s -m 5 -o /dev/null -w '%{http_code}' ${CATTLE_SERVER_URL}/dashboard/)"; do
  sleep 5
  TIME=$((TIME + 5))
  echo "${TIME}s ..."
  if [ $TIME -ge 600 ]; then
    echo "Dashboard did not become available in a reasonable time"
    kubectl -n $RANCHER_NAMESPACE get pods
    exit 1
  fi
done

echo ""
echo "Waiting for rancher-webhook to be running ..."
okay=0
while [ $okay -lt 30 ]; do
  if kubectl -n $RANCHER_NAMESPACE get po -l app=rancher-webhook 2>/dev/null | grep -q '1/1.*Running'; then
    break
  fi
  echo "Webhook not ready, checking again in 10s ..."
  okay=$((okay + 1))
  sleep 10
done

# Namespace the developer-load UIPlugin CR lives in (created by the extension setup).
kubectl create namespace cattle-ui-plugin-system --dry-run=client -o yaml | kubectl apply -f -

# Rancher is intentionally left un-bootstrapped: the Cypress `setup/rancher-setup.spec.ts`
# spec performs the UI first-login (bootstrap password, EULA, server-url) before the feature
# specs run, matching the upstream flow.

echo ""
echo "Done. kubeconfig written to ${KUBECONFIG_PATH}"
