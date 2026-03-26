import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin if credentials are provided
let isFirebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log('[PUSH] Firebase Admin SDK initialized successfully.');
  } else {
    console.warn('[PUSH] FIREBASE_SERVICE_ACCOUNT not found in environment. Push notifications are disabled.');
  }
} catch (error) {
  console.error('[PUSH] Failed to initialize Firebase Admin SDK:', error.message);
}

/**
 * Send a push notification to specific FCM tokens
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {object} payload - Notification payload { title, body, data }
 */
export const sendPushNotification = async (tokens, payload) => {
  if (!isFirebaseInitialized || !tokens || tokens.length === 0) {
    return false;
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    tokens: tokens, // Multicast message
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[PUSH] Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);
    
    // Optional: Identify invalid tokens and remove them from the database
    // This requires cross-referencing response.responses with tokens array
    // We can just return the raw response for the caller to handle if needed
    
    return { success: true, response };
  } catch (error) {
    console.error('[PUSH] Error sending push notification:', error);
    return { success: false, error };
  }
};
