#!/usr/bin/env bash
# Full deploy: build Lambda artifacts, apply Terraform (infra + API),
# then build and publish the frontend.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building Lambda layer + package"
npm run lambda:layer
npm run lambda:package

echo "==> Terraform apply"
cd terraform
terraform init -input=false
terraform apply -auto-approve
cd ..

echo "==> Deploying frontend"
bash scripts/deploy-s3.sh

echo "🎉 Done. Visit https://chooseyourprotocol.com"
