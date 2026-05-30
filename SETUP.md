# Go-Live Checklist

The AWS infrastructure (S3, CloudFront, Route53, ACM, Lambda, API Gateway) is
provisioned by Terraform. A few **Firebase-owner actions** remain — they require
your Google/Firebase login, so they can't be automated from here.

## 1. Firestore database
Firebase Console → **Build → Firestore Database → Create database** → *Native mode*,
location `nam5` (US). (Skip if it already exists.)

## 2. Auth providers
Firebase Console → **Build → Authentication → Sign-in method** → enable:
- **Email/Password**
- **Google**

## 3. Authorized domains (needed for Google sign-in on the live site)
Authentication → **Settings → Authorized domains** → Add:
- `chooseyourprotocol.com`
- `www.chooseyourprotocol.com`

(`localhost` is already there for local dev.)

## 4. Service account → SSM  ← *the one secret the backend needs*
Firebase Console → **Project settings → Service accounts → Generate new private key**.
Save the JSON somewhere local (it's gitignored), then:

```bash
bash scripts/put-firebase-secret.sh ~/Downloads/chooseyourprotocol-firebase-adminsdk.json
```

This base64-encodes it into SSM at `/chooseyourprotocol/production/firebase_service_account`,
which the Lambda reads at runtime. Without it, `/api/auth/bootstrap` returns 500.

## 5. Deploy Firestore rules + indexes
```bash
firebase login            # one-time, interactive (use:  ! firebase login )
firebase use chooseyourprotocol
firebase deploy --only firestore:rules,firestore:indexes
```

## 6. Done
Visit **https://chooseyourprotocol.com**, sign in with your work email, and the
first person from a given email domain becomes that organization's admin.

---

### Desktop agent (optional, per user)
```bash
cd agent && npm install
# configure agent.config.json (email/password + OPENAI_API_KEY) — see agent/README.md
npm start            # headless
npm run electron     # tray app
```
The agent needs `OPENAI_API_KEY` for the OpenAI Agents SDK features (knowledge-base
synthesis + level-up scheduling); without it, it still posts work-context signals.
