import { db } from '../server/config/firebase-admin.ts';

async function diagnoseAll() {
    try {
        console.log('--- Diagnosis Start ---');
        
        const enrollments = await db.collection('enrollments').get();
        console.log(`Total Enrollments: ${enrollments.size}`);
        
        const sessions = await db.collection('sessions').get();
        console.log(`Total Sessions: ${sessions.size}`);
        
        const sessionCourseIds = new Set(sessions.docs.map(d => d.data().courseId));
        console.log(`Unique Course IDs with Sessions: ${sessionCourseIds.size}`);
        
        const studentsWithSessions = new Set();
        const studentsMissingSessions = new Set();
        
        for (const enrDoc of enrollments.docs) {
            const enr = enrDoc.data();
            const studentId = enr.studentId || enr.student_id;
            if (sessionCourseIds.has(enr.courseId || enr.course_id)) {
                studentsWithSessions.add(studentId);
            } else {
                studentsMissingSessions.add(studentId);
            }
        }
        
        console.log(`Students who SHOULD see sessions: ${studentsWithSessions.size}`);
        console.log(`Students who will see NO sessions: ${studentsMissingSessions.size}`);
        
        if (studentsWithSessions.size > 0) {
            const sampleId = Array.from(studentsWithSessions)[0];
            console.log(`\nSampling Student: ${sampleId}`);
            
            const userDoc = await db.collection('users').doc(sampleId as string).get();
            console.log(`User Info: ${userDoc.data()?.name} (${userDoc.data()?.email})`);
            
            const myEnrs = await db.collection('enrollments').where('studentId', '==', sampleId).get();
            const myCourseIds = myEnrs.docs.map(d => d.data().courseId);
            console.log(`Enrolled Courses: ${myCourseIds.join(', ')}`);
            
            for (const cid of myCourseIds) {
                const courseSess = await db.collection('sessions').where('courseId', '==', cid).get();
                console.log(`  Course ${cid} has ${courseSess.size} sessions.`);
                if (courseSess.size > 0) {
                    const sess = courseSess.docs[0].data();
                    console.log(`    Sample Session: ${courseSess.docs[0].id} | Date: ${sess.date} | Status: ${sess.status}`);
                }
            }
        }
        
        console.log('\n--- Diagnosis End ---');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

diagnoseAll();
