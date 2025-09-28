import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with multiple fallbacks:
// 1) Base64-encoded service account JSON via FIREBASE_SERVICE_ACCOUNT_B64
// 2) Discrete env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// 3) Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS or platform ADC)

function initAdmin() {
  if (admin.apps.length > 0) return; // already initialized

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (b64) {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(json),
        projectId: json.project_id || projectId,
      });
      console.log('[Firebase Admin] Initialized from FIREBASE_SERVICE_ACCOUNT_B64');
      return;
    }

    if (clientEmail && privateKey) {
      // Handle escaped newlines in env var
      privateKey = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId as string,
          clientEmail,
          privateKey: privateKey as string,
        }),
        projectId: projectId as string,
      });
      console.log('[Firebase Admin] Initialized from discrete envs');
      return;
    }

    if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log('[Firebase Admin] Initialized with ADC and projectId');
      return;
    }

    // Final fallback: ADC without explicit projectId
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('[Firebase Admin] Initialized with ADC (no explicit projectId)');
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization failed:', err?.message || err);
    // Re-throw to fail fast, since auth depends on this
    throw err;
  }
}

initAdmin();

export default admin;
