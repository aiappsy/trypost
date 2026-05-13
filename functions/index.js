/**
 * Firebase Cloud Functions for PostPro
 * 
 * These functions handle server-side operations that need to run
 * in response to Firestore events or HTTP requests.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * On User Create - Initialize user document in Firestore
 * Triggered when a new user signs up via Firebase Auth
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(user.uid).set(userData);
  
  console.log(`Created user document for ${user.uid}`);
});

/**
 * On User Delete - Clean up user data
 * Triggered when a user account is deleted
 */
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  
  // Delete user document
  await db.collection('users').doc(userId).delete();
  
  console.log(`Deleted user document for ${userId}`);
});

/**
 * On Workspace Create - Set up default workspace structure
 * Triggered when a new workspace is created
 */
exports.onWorkspaceCreate = functions.firestore
  .document('workspaces/{workspaceId}')
  .onCreate(async (snap, context) => {
    const workspaceId = context.params.workspaceId;
    const workspaceData = snap.data();
    
    // Initialize subcollections with default data if needed
    const batch = db.batch();
    
    // Add default labels
    const defaultLabels = ['Important', 'Draft', 'Scheduled', 'Published'];
    defaultLabels.forEach((label) => {
      const labelRef = db.collection('workspaces').doc(workspaceId)
        .collection('labels').doc();
      batch.set(labelRef, {
        name: label,
        color: '#3b82f6',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    console.log(`Initialized workspace ${workspaceId} with default labels`);
  });

/**
 * On Post Status Change - Send notifications
 * Triggered when a post status changes (e.g., published, failed)
 */
exports.onPostStatusChange = functions.firestore
  .document('workspaces/{workspaceId}/posts/{postId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger if status changed
    if (before.status === after.status) {
      return;
    }
    
    const workspaceId = context.params.workspaceId;
    const postId = context.params.postId;
    
    // Get workspace owner for notification
    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
    const workspaceData = workspaceDoc.data();
    
    if (!workspaceData) return;
    
    // Create notification
    const notification = {
      type: `post_${after.status}`,
      message: `Your post has been ${after.status}`,
      postId: postId,
      readAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Notify workspace owner
    await db.collection('notifications').add({
      ...notification,
      userId: workspaceData.owner_id,
    });
    
    // Notify workspace members
    if (workspaceData.members && Array.isArray(workspaceData.members)) {
      const memberNotifications = workspaceData.members.map(memberId => ({
        ...notification,
        userId: memberId,
      }));
      
      const batch = db.batch();
      memberNotifications.forEach(n => {
        batch.set(db.collection('notifications').doc(), n);
      });
      await batch.commit();
    }
    
    console.log(`Sent notifications for post ${postId} status change to ${after.status}`);
  });

/**
 * Scheduled Function - Clean up old notifications
 * Runs daily to delete notifications older than 30 days
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldNotifications = await db.collection('notifications')
      .where('createdAt', '<', thirtyDaysAgo)
      .limit(1000)
      .get();
    
    const batch = db.batch();
    oldNotifications.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Cleaned up ${oldNotifications.size} old notifications`);
  });

/**
 * Scheduled Function - Reset monthly AI credits
 * Runs on the 1st of each month
 */
exports.resetMonthlyCredits = functions.pubsub
  .schedule('0 0 1 * *') // First day of every month at midnight UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    const accounts = await db.collection('accounts').get();
    
    const batch = db.batch();
    accounts.forEach(doc => {
      batch.update(doc.ref, {
        creditsUsed: 0,
        lastCreditReset: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    console.log(`Reset monthly credits for ${accounts.size} accounts`);
  });

/**
 * HTTP Function - Verify Firebase ID token (for Laravel backend)
 * Can be called from Laravel to verify Firebase auth tokens
 */
exports.verifyToken = functions.https.onCall(async (data, context) => {
  const { token } = data;
  
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Token required');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
    };
  } catch (error) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid token');
  }
});
