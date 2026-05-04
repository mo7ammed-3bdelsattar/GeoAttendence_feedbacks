import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getInstructorReport = async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;
    if (!facultyId) return res.status(400).json({ error: 'facultyId is required' });

    // 1. Get all courses taught by this instructor
    const coursesSnap = await db.collection('courses').where('facultyId', '==', facultyId).get();
    const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const courseReports = await Promise.all(courses.map(async (course) => {
      // 2. Get all groups for this course
      const groupsSnap = await db.collection('groups').where('courseId', '==', course.id).get();
      const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const groupData = await Promise.all(groups.map(async (group) => {
        // 3. Get all students enrolled in this group
        const enrollmentsSnap = await db.collection('enrollments').where('groupId', '==', group.id).get();
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);

        // 4. Get all sessions for this group
        const sessionsSnap = await db.collection('sessions').where('groupId', '==', group.id).get();
        const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sessionCount = sessions.length;

        const students = await Promise.all(studentIds.map(async (studentId) => {
          const userSnap = await db.collection('users').doc(studentId).get();
          const userData = userSnap.data();

          // Count attendance for this student across all group sessions
          let presentCount = 0;
          if (sessions.length > 0) {
            const attendanceSnap = await db.collection('attendance')
              .where('studentId', '==', studentId)
              .where('sessionId', 'in', sessions.map(s => s.id).slice(0, 30))
              .get();
            presentCount = attendanceSnap.size;
          }

          const absenceCount = sessionCount - presentCount;
          const attendancePercentage = sessionCount > 0 ? (presentCount / sessionCount) * 100 : 0;

          return {
            studentId,
            studentName: userData?.name || 'Unknown Student',
            presentCount,
            absenceCount,
            attendancePercentage: Number(attendancePercentage.toFixed(2))
          };
        }));

        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: studentIds.length,
          sessionCount,
          students
        };
      }));

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        groups: groupData
      };
    }));

    res.json({
      success: true,
      data: {
        facultyId,
        courses: courseReports
      }
    });

  } catch (error: any) {
    console.error('[Instructor Report Error]', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAdminAttendanceReport = async (req: Request, res: Response) => {
  try {
    // 1. Get all courses in the system
    const coursesSnap = await db.collection('courses').get();
    const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const courseReports = await Promise.all(courses.map(async (course) => {
      // 2. Get all groups for this course
      const groupsSnap = await db.collection('groups').where('courseId', '==', course.id).get();
      const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const groupData = await Promise.all(groups.map(async (group) => {
        const enrollmentsSnap = await db.collection('enrollments').where('groupId', '==', group.id).get();
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);

        const sessionsSnap = await db.collection('sessions').where('groupId', '==', group.id).get();
        const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sessionCount = sessions.length;

        const students = await Promise.all(studentIds.map(async (studentId) => {
          const userSnap = await db.collection('users').doc(studentId).get();
          const userData = userSnap.data();

          let presentCount = 0;
          if (sessions.length > 0) {
            const attendanceSnap = await db.collection('attendance')
              .where('studentId', '==', studentId)
              .where('sessionId', 'in', sessions.map(s => s.id).slice(0, 30))
              .get();
            presentCount = attendanceSnap.size;
          }

          return {
            studentId,
            studentName: userData?.name || 'Unknown Student',
            presentCount,
            absenceCount: sessionCount - presentCount,
            attendancePercentage: sessionCount > 0 ? Number(((presentCount / sessionCount) * 100).toFixed(2)) : 0
          };
        }));

        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: studentIds.length,
          sessionCount,
          students
        };
      }));

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        groups: groupData
      };
    }));

    res.json({
      success: true,
      data: {
        totalCourses: courses.length,
        courses: courseReports
      }
    });

  } catch (error: any) {
    console.error('[Admin Attendance Report Error]', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAdminReport = async (req: Request, res: Response) => {
  try {
    const [usersSnap, coursesSnap, enrollmentsSnap, feedbackSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('courses').get(),
      db.collection('enrollments').get(),
      db.collection('feedback').get()
    ]);

    const stats = {
      totalUsers: usersSnap.size,
      totalStudents: usersSnap.docs.filter(d => d.data().role === 'student').length,
      totalInstructors: usersSnap.docs.filter(d => d.data().role === 'faculty').length,
      totalCourses: coursesSnap.size,
      totalEnrollments: enrollmentsSnap.size,
      totalFeedbacks: feedbackSnap.size,
      averageGlobalRating: feedbackSnap.size > 0 
        ? feedbackSnap.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0) / feedbackSnap.size 
        : 0
    };

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
