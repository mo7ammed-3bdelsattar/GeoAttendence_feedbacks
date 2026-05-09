import { db } from '../server/config/firebase-admin.ts';

async function diagnose() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`Diagnosing for date: ${today}`);
        
        const sessionsToday = await db.collection('sessions').where('date', '==', today).get();
        console.log(`Found ${sessionsToday.size} sessions today.`);
        
        for (const sessDoc of sessionsToday.docs) {
            const sess = sessDoc.data();
            console.log(`\nSession: ${sessDoc.id} | Course: ${sess.courseId} | Status: ${sess.status}`);
            
            const enrs = await db.collection('enrollments').where('courseId', '==', sess.courseId).get();
            console.log(`  Enrollments for this course (camelCase): ${enrs.size}`);
            
            const enrsSnake = await db.collection('enrollments').where('course_id', '==', sess.courseId).get();
            console.log(`  Enrollments for this course (snake_case): ${enrsSnake.size}`);
            
            const allEnrs = [...enrs.docs, ...enrsSnake.docs];
            
            for (const enrDoc of allEnrs) {
                const enr = enrDoc.data();
                const studentId = enr.studentId || enr.student_id;
                console.log(`    Enrolled Student: ${studentId}`);
                
                const userDoc = await db.collection('users').doc(studentId).get();
                if (userDoc.exists) {
                    console.log(`      User Name: ${userDoc.data()?.name} | Email: ${userDoc.data()?.email}`);
                } else {
                    console.log(`      User NOT FOUND in 'users' collection!`);
                }
            }
        }
        const snakeSess = await db.collection('sessions').where('course_id', '>', '').get();
        console.log(`\nFound ${snakeSess.size} sessions with 'course_id' (snake_case).`);
        if (snakeSess.size > 0) {
            console.log('Sample snake_case session:', snakeSess.docs[0].data());
        }
    process.exit(0);
}

diagnose();
