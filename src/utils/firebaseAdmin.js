import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// To use this, you need to download a service account JSON from Firebase Console:
// Project Settings -> Service Accounts -> Generate new private key
// Then either point to it or paste the values here.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Fallback for simple verification (might require GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp({
    projectId: "safetywatch-96157"
  });
}

export const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return { success: true, decodedToken };
  } catch (error) {
    console.error("Firebase ID Token Verification Error:", error);
    return { success: false, error: error.message };
  }
};
