// Firebase Admin initialization for the ChooseYourProtocol Lambda API.
//
// Credentials come from a base64-encoded service-account JSON:
//   - local dev:   process.env.FIREBASE_SERVICE_ACCOUNT (from .env.local)
//   - production:  AWS SSM Parameter Store at /chooseyourprotocol/<stage>/firebase_service_account
//
// Initialization is memoized so warm Lambda invocations reuse the same app.
const admin = require('firebase-admin');

let firebaseApp = null;

async function loadServiceAccountJson() {
  const isLocal = process.env.IS_OFFLINE === 'true' || process.env.STAGE === 'local';

  if (isLocal) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!b64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not set in environment (.env.local)');
    }
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  // Production: read from SSM (encrypted).
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  const region = process.env.AWS_REGION || 'us-east-1';
  const stage = process.env.STAGE || 'production';
  const ssm = new SSMClient({ region });
  const res = await ssm.send(
    new GetParameterCommand({
      Name: `/chooseyourprotocol/${stage}/firebase_service_account`,
      WithDecryption: true
    })
  );
  const value = res.Parameter && res.Parameter.Value;
  if (!value) throw new Error('Firebase service account not found in SSM');
  // The SSM value may itself be base64 (recommended) or raw JSON — handle both.
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) return trimmed;
  return Buffer.from(trimmed, 'base64').toString('utf8');
}

async function initialize() {
  if (firebaseApp) return firebaseApp;
  const json = await loadServiceAccountJson();
  const serviceAccount = JSON.parse(json);
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  return firebaseApp;
}

module.exports = { initialize, admin };
