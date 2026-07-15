// Grant (or revoke) the `superadmin: true` custom claim for a Firebase user.
//
// Usage:
//   node scripts/set-superadmin.js <email>            # grant
//   node scripts/set-superadmin.js <email> --revoke   # revoke
//
// Credentials come from utils/firebaseInit: FIREBASE_SERVICE_ACCOUNT env when
// IS_OFFLINE/STAGE=local is set, otherwise the SSM parameter (needs AWS creds).
// The user must have signed in at least once so the Firebase account exists.
// The claim lands on their token at next refresh (~1h) or next sign-in; the
// bootstrap endpoint preserves it when it re-stamps orgId/role.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { initialize, admin } = require('../utils/firebaseInit');

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/set-superadmin.js <email> [--revoke]');
  process.exit(1);
}

try {
  await initialize();
  const user = await admin.auth().getUserByEmail(email);
  const claims = { ...(user.customClaims || {}) };
  if (revoke) delete claims.superadmin;
  else claims.superadmin = true;
  await admin.auth().setCustomUserClaims(user.uid, claims);
  console.log(`✅ ${revoke ? 'Revoked superadmin from' : 'Granted superadmin to'} ${email} (uid ${user.uid})`);
  console.log('   Claims now:', JSON.stringify(claims));
  console.log('   Takes effect on their next token refresh or sign-in.');
  process.exit(0);
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`❌ No Firebase user for ${email} — they need to sign in once first.`);
  } else {
    console.error('❌ Failed:', err.message);
  }
  process.exit(1);
}
