import cron from 'node-cron';
import { db, messaging } from '../config/firebase-admin';

/**
 * Logic to send notifications to students enrolled in sessions starting in N minutes
 */
export async function sendUpcomingSessionNotifications(minutesAhead: number = 15) {
  try {
    const now = new Date();
    // Round to the nearest minute to avoid small offset issues
    const targetTime = new Date(now.getTime() + minutesAhead * 60000);
    
    // Format target time to HH:mm
    const hours = String(targetTime.getHours()).padStart(2, '0');
    const minutes = String(targetTime.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // Format date to ISO date string (YYYY-MM-DD)
    const dateStr = targetTime.toISOString().split('T')[0];

    console.log(`[CRON] Checking for sessions starting at ${timeStr} on ${dateStr}`);

    // 1. Find sessions starting at exactly this time
    const sessionsSnapshot = await db.collection('sessions')
      .where('date', '==', dateStr)
      .where('startTime', '==', timeStr)
      .get();

    if (sessionsSnapshot.empty) {
      return;
    }

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      const courseId = sessionData.courseId;
      const sessionId = sessionDoc.id;

      // 2. Find enrolled students for this course
      const enrollmentsSnapshot = await db.collection('enrollments')
        .where('courseId', '==', courseId)
        .get();

      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
      
      if (studentIds.length === 0) continue;

      // 3. Fetch student user profiles to get pushTokens
      // FCM allows up to 500 tokens in a single multicast send
      const studentProfilesSnapshot = await db.collection('users')
        .where('id', 'in', studentIds.slice(0, 30)) // Batching for 'in' query limit (30)
        .get();

      const tokens: string[] = [];
      studentProfilesSnapshot.docs.forEach(doc => {
        const token = doc.data().pushToken;
        if (token) tokens.push(token);
      });

      if (tokens.length === 0) continue;

      // 4. Send multicast notification via FCM
      const message = {
        notification: {
          title: 'Upcoming Session Reminder',
          body: `Your session for course ${sessionData.courseName || courseId} starts in ${minutesAhead} minutes!`,
        },
        data: {
          sessionId: sessionId,
          type: 'SESSION_REMINDER'
        },
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`[CRON] Sent ${response.successCount} notifications for session ${sessionId}`);
    }

  } catch (error) {
    console.error('[CRON ERROR]', error);
  }
}

/**
 * Initialize the cron job to run every minute
 */
export function initNotificationCron() {
  console.log('[CRON] Initializing notification cron job (every minute)...');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    await sendUpcomingSessionNotifications(15);
  });
}
