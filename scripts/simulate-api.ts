import { db } from '../server/config/firebase-admin';

async function simulate() {
    try {
        const studentId = 's1a9MGqq0sULcwZq11mkFXRH31m1'; // The one from my diagnosis
        console.log(`Simulating getSessionsByStudent for: ${studentId}`);
        
        const enrollments = await db.collection('enrollments').where('studentId', '==', studentId).get();
        const courseIds = Array.from(new Set(enrollments.docs.map((doc) => doc.data().courseId)));
        console.log(`Enrolled Course IDs:`, courseIds);
        
        if (courseIds.length === 0) {
            console.log('No enrollments found.');
            return;
        }

        let sessionDocs: any[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const snap = await db.collection('sessions').where('courseId', 'in', courseIds.slice(i, i + 30)).get();
            sessionDocs = sessionDocs.concat(snap.docs);
        }
        console.log(`Found ${sessionDocs.size || sessionDocs.length} raw sessions.`);
        
        const sessionsToday = sessionDocs.filter(doc => doc.data().date === '2026-05-09');
        console.log(`Sessions today: ${sessionsToday.length}`);
        if (sessionsToday.length > 0) {
            console.log('Sample session today data:', sessionsToday[0].data());
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

simulate();
