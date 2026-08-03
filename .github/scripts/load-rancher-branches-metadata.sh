#!/bin/bash

# Helper script to load Rancher branches metadata from a JSON file and set outputs for GitHub Actions.

set -e

BRANCHES_METADATA_URL="${1}"
BRANCH_NAME="${2}"

if [[ -z "$BRANCHES_METADATA_URL" ]]; then
  echo "Error: BRANCHES_METADATA_URL is required as the first argument"
  exit 1
fi

if [[ -z "$BRANCH_NAME" ]]; then
  echo "Error: BRANCH_NAME is required as the second argument"
  exit 1
fi

# Fetch the metadata file
if ! METADATA=$(curl -s -f "$BRANCHES_METADATA_URL"); then
  echo "Error: Failed to fetch metadata from $BRANCHES_METADATA_URL"
  echo "Check that the URL is correct and the file exists"
  exit 1
fi

# Verify the helm section exists
if ! echo "$METADATA" | jq -e --arg branch "$BRANCH_NAME" '.branches[$branch].e2e.helm' > /dev/null 2>&1; then
  echo "Error: Missing 'helm' section for branch '$BRANCH_NAME'"
  echo "Expected path: .branches.$BRANCH_NAME.e2e.helm"
  echo "Available branches: $(echo "$METADATA" | jq -r '.branches | keys | join(", ")')"
  exit 1
fi

# Verify the kube section exists
if ! echo "$METADATA" | jq -e --arg branch "$BRANCH_NAME" '.branches[$branch].e2e.kube' > /dev/null 2>&1; then
  echo "Error: Missing 'kube' section for branch '$BRANCH_NAME'"
  echo "Expected path: .branches.$BRANCH_NAME.e2e.kube"
  exit 1
fi

# Extract kube version
K3S_VERSION=$(echo "$METADATA" | jq -r --arg branch "$BRANCH_NAME" '.branches[$branch].e2e.kube.version')

# Validate K3S_VERSION
if [[ -z "$K3S_VERSION" ]] || [[ "$K3S_VERSION" == "null" ]]; then
  echo "Error: k3s version is empty or null for branch '$BRANCH_NAME'"
  echo "Metadata path: .branches.$BRANCH_NAME.e2e.kube.version"
  exit 1
fi

# Extract helm repo URL
RANCHER_HELM_REPO_URL=$(echo "$METADATA" | jq -r --arg branch "$BRANCH_NAME" '.branches[$branch].e2e.helm["repo-url"]')

# Validate RANCHER_HELM_REPO_URL
if [[ -z "$RANCHER_HELM_REPO_URL" ]] || [[ "$RANCHER_HELM_REPO_URL" == "null" ]]; then
  echo "Error: Helm repo URL is empty or null for branch '$BRANCH_NAME'"
  echo "Metadata path: .branches.$BRANCH_NAME.e2e.helm[\"repo-url\"]"
  exit 1
fi

# Log extracted values
echo "Successfully extracted metadata for branch: $BRANCH_NAME"
echo "  K3S_VERSION: $K3S_VERSION"
echo "  RANCHER_HELM_REPO_URL: $RANCHER_HELM_REPO_URL"

# Set environment variables for subsequent job steps
echo "K3S_VERSION=$K3S_VERSION" >> "$GITHUB_ENV"
echo "RANCHER_HELM_REPO_URL=$RANCHER_HELM_REPO_URL" >> "$GITHUB_ENV"
