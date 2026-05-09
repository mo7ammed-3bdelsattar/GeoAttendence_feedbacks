import { db } from '../server/config/firebase-admin.ts';

async function check() {
    try {
        const studentCourses = await db.collection('student_courses').get();
        const enrollments = await db.collection('enrollments').get();
        console.log(`student_courses count: ${studentCourses.size}`);
        console.log(`enrollments count: ${enrollments.size}`);
        
        const today = new Date().toISOString().split('T')[0];
        console.log(`Checking for sessions with date: ${today}`);
        const sessionsToday = await db.collection('sessions').where('date', '==', today).get();
        console.log(`Sessions today count: ${sessionsToday.size}`);
        if (sessionsToday.size > 0) {
            const sess = sessionsToday.docs[0].data();
            console.log('Sample session today:', sess);
            const enrs = await db.collection('enrollments').where('courseId', '==', sess.courseId).get();
            console.log(`Enrollments count for course ${sess.courseId}: ${enrs.size}`);
            if (enrs.size > 0) {
                console.log('Sample enrollment for this session:', enrs.docs[0].data());
            }
        }
        if (enrollments.size > 0) {
            const sample = enrollments.docs[0].data();
            console.log('Sample enrollments:', sample);
            const sessions = await db.collection('sessions').where('courseId', '==', sample.courseId).get();
            console.log(`Sessions count for course ${sample.courseId}: ${sessions.size}`);
            if (sessions.size > 0) {
                console.log('Sample session:', sessions.docs[0].data());
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
