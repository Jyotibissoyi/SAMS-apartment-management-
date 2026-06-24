const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let fcmInitialized = false;

// Attempt to initialize Firebase Admin SDK if path is configured
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  try {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(__dirname, '..', '..', serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = require(resolvedPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      fcmInitialized = true;
      console.log('Firebase Admin SDK initialized successfully for push notifications.');
    } else {
      console.warn(`Firebase service account file not found at: ${resolvedPath}. Falling back to notification mock simulator.`);
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
  }
} else {
  console.log('No FIREBASE_SERVICE_ACCOUNT_PATH provided. Push notifications will run in SIMULATION mode.');
}

/**
 * Sends a notification to a specific role, topic, or user device token.
 * 
 * @param {Object} options Configuration parameters
 * @param {string} options.title Title of the notification
 * @param {string} options.body Body of the notification
 * @param {string} [options.topic] FCM Topic to publish to (e.g. "ALL", "SECURITY", "RESIDENTS")
 * @param {string} [options.token] Specific device token
 * @param {Object} [options.data] Key-value payload data
 */
const sendNotification = async ({ title, body, topic, token, data = {} }) => {
  const payload = {
    notification: { title, body },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard navigation signal
      time: new Date().toISOString()
    }
  };

  if (fcmInitialized) {
    try {
      if (token) {
        payload.token = token;
        const response = await admin.messaging().send(payload);
        console.log('FCM Notification sent to device token successfully:', response);
        return { success: true, response };
      } else if (topic) {
        // FCM topic naming rules: [a-zA-Z0-9-_.~%]+
        const safeTopic = topic.toLowerCase().replace(/[^a-z0-9-_.~%]/g, '_');
        payload.topic = safeTopic;
        const response = await admin.messaging().send(payload);
        console.log(`FCM Notification sent to topic "${safeTopic}" successfully:`, response);
        return { success: true, response };
      }
    } catch (error) {
      console.error('FCM Transmission Error:', error.message);
      // Fail gracefully and log
      return { success: false, error: error.message };
    }
  }

  // Simulation mode
  console.log('\n===== [NOTIFICATION SIMULATOR] =====');
  console.log(`TIME:    ${new Date().toLocaleString()}`);
  console.log(`TARGET:  ${token ? `Device Token [${token}]` : `Topic [${topic || 'ALL'}]`}`);
  console.log(`TITLE:   📢 ${title}`);
  console.log(`MESSAGE: 📝 ${body}`);
  console.log(`DATA:    ${JSON.stringify(data, null, 2)}`);
  console.log('=====================================\n');

  return { success: true, simulated: true };
};

module.exports = {
  sendNotification
};
