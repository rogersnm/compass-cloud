#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="eu-west-2"
AWS_PROFILE="personal"
CLUSTER="compass"
REPO="compass-cloud"

export AWS_PROFILE AWS_REGION

# Resolve account ID and ECR URI
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}"

# Resolve the ECS service name (there's only one service in the cluster)
SERVICE=$(aws ecs list-services --cluster "$CLUSTER" \
  --query 'serviceArns[0]' --output text | awk -F/ '{print $NF}')

if [ -z "$SERVICE" ] || [ "$SERVICE" = "None" ]; then
  echo "error: no ECS service found in cluster ${CLUSTER}" >&2
  exit 1
fi

TAG="${1:-latest}"
IMAGE="${ECR_URI}:${TAG}"

echo "==> Logging in to ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin \
  "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Building arm64 image"
docker build --platform linux/arm64 -t "$IMAGE" .

echo "==> Pushing ${IMAGE}"
docker push "$IMAGE"

echo "==> Deploying to ECS (cluster=${CLUSTER}, service=${SERVICE})"
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
  --output table

echo "==> Waiting for service to stabilize..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"

echo "==> Deploy complete"
