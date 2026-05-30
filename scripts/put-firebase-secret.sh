#!/usr/bin/env bash
# Upload the Firebase Admin service-account JSON to SSM (base64, encrypted),
# where the Lambda reads it at runtime.
#
# Usage: bash scripts/put-firebase-secret.sh /path/to/serviceAccount.json [stage]
set -euo pipefail

FILE="${1:?Usage: put-firebase-secret.sh <serviceAccount.json> [stage]}"
STAGE="${2:-production}"
REGION="${AWS_REGION:-us-east-1}"
NAME="/chooseyourprotocol/${STAGE}/firebase_service_account"

if [ ! -f "$FILE" ]; then echo "❌ File not found: $FILE"; exit 1; fi

B64=$(base64 -i "$FILE" | tr -d '\n')
aws ssm put-parameter --name "$NAME" --type SecureString --value "$B64" \
  --overwrite --region "$REGION" >/dev/null

echo "✅ Stored Firebase service account at SSM $NAME ($REGION)"
echo "   The Lambda will pick it up on its next (cold) invocation."
