#!/usr/bin/env bash
# Build the frontend and sync it to S3, then invalidate CloudFront.
# Reads the bucket + distribution id from terraform outputs.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "📦 Building frontend…"
npm run build

BUCKET=$(cd terraform && terraform output -raw site_bucket)
DIST_ID=$(cd terraform && terraform output -raw cloudfront_distribution_id)
REGION=${AWS_REGION:-us-east-1}

echo "📤 Syncing dist/ -> s3://$BUCKET"
# Long-cache the fingerprinted assets, no-cache the HTML entry point.
aws s3 sync dist/ "s3://$BUCKET" --delete --region "$REGION" \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --region "$REGION" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "🔄 Invalidating CloudFront $DIST_ID"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "✅ Frontend deployed."
