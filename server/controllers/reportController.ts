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
      // 2. Get all students enrolled in this course (Primary Source)
      const courseEnrollmentsSnap = await db.collection('enrollments').where('courseId', '==', course.id).get();
      const courseStudentIds = Array.from(new Set(courseEnrollmentsSnap.docs.map(doc => doc.data().studentId)));

      // 3. Get all groups for this course
      const groupsSnap = await db.collection('groups').where('courseId', '==', course.id).get();
      const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 4. Get all sessions for this course
      const courseSessionsSnap = await db.collection('sessions').where('courseId', '==', course.id).get();
      const courseSessions = courseSessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const groupData = await Promise.all(groups.map(async (group) => {
        // Find students explicitly assigned to this group
        const groupEnrollments = courseEnrollmentsSnap.docs.filter(d => d.data().groupId === group.id);
        let groupStudentIds = groupEnrollments.map(d => d.data().studentId);

        // FALLBACK: If no students are assigned to groups, treat all course students as part of the group for reporting
        if (groupStudentIds.length === 0 && groups.length === 1) {
            groupStudentIds = courseStudentIds;
        }

        // Find sessions explicitly assigned to this group
        let groupSessions = courseSessions.filter(s => s.groupId === group.id);
        
        // FALLBACK: If no sessions are assigned to groups, treat all course sessions as part of the group
        if (groupSessions.length === 0 && groups.length === 1) {
            groupSessions = courseSessions;
        }

        const sessionCount = groupSessions.length;

        // Get feedback for this group
        const feedbackSnap = await db.collection('feedback').where('groupId', '==', group.id).get();
        const feedbacks = feedbackSnap.docs.map(doc => doc.data());
        const averageRating = feedbacks.length > 0 
          ? Number((feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1))
          : 0;

        const students = await Promise.all(groupStudentIds.map(async (studentId) => {
          const userSnap = await db.collection('users').doc(studentId).get();
          const userData = userSnap.data();

          let presentCount = 0;
          if (groupSessions.length > 0) {
            const sessionIds = groupSessions.map(s => s.id);
            for (let i = 0; i < sessionIds.length; i += 30) {
                const chunk = sessionIds.slice(i, i + 30);
                const attendanceSnap = await db.collection('attendance')
                  .where('studentId', '==', studentId)
                  .where('sessionId', 'in', chunk)
                  .get();
                presentCount += attendanceSnap.size;
            }
          }

          const absenceCount = Math.max(0, sessionCount - presentCount);
          const attendancePercentage = sessionCount > 0 ? (presentCount / sessionCount) * 100 : 0;

          return {
            studentId,
            studentName: userData?.name || 'Unknown Student',
            presentCount,
            absenceCount,
            attendancePercentage: Number(attendancePercentage.toFixed(2))
          };
        }));

        const groupAttendanceRate = students.length > 0
          ? Number((students.reduce((acc, s) => acc + s.attendancePercentage, 0) / students.length).toFixed(1))
          : 0;

        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: groupStudentIds.length,
          sessionCount,
          averageRating,
          attendanceRate: groupAttendanceRate,
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

    // Flatten groups for frontend
    const allGroups = courseReports.flatMap(c => c.groups.map(g => ({
      ...g,
      courseName: c.courseName,
      courseCode: c.courseCode
    })));

    res.json({
      success: true,
      data: {
        facultyId,
        groups: allGroups,
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
      // 2. Get all students enrolled in this course (Primary Source)
      const courseEnrollmentsSnap = await db.collection('enrollments').where('courseId', '==', course.id).get();
      const courseStudentIds = Array.from(new Set(courseEnrollmentsSnap.docs.map(doc => doc.data().studentId)));

      // 3. Get all groups for this course
      const groupsSnap = await db.collection('groups').where('courseId', '==', course.id).get();
      const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 4. Get all sessions for this course
      const courseSessionsSnap = await db.collection('sessions').where('courseId', '==', course.id).get();
      const courseSessions = courseSessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const groupData = await Promise.all(groups.map(async (group) => {
        // Find students explicitly assigned to this group
        const groupEnrollments = courseEnrollmentsSnap.docs.filter(d => d.data().groupId === group.id);
        let groupStudentIds = groupEnrollments.map(d => d.data().studentId);

        // FALLBACK: If no students assigned to groups, treat all course students as group students
        if (groupStudentIds.length === 0 && groups.length === 1) {
            groupStudentIds = courseStudentIds;
        }

        // Find sessions explicitly assigned to this group
        let groupSessions = courseSessions.filter(s => s.groupId === group.id);
        
        // FALLBACK: If no sessions assigned to groups, treat all course sessions as part of the group
        if (groupSessions.length === 0 && groups.length === 1) {
            groupSessions = courseSessions;
        }

        const sessionCount = groupSessions.length;

        const students = await Promise.all(groupStudentIds.map(async (studentId) => {
          const userSnap = await db.collection('users').doc(studentId).get();
          const userData = userSnap.data();

          let presentCount = 0;
          if (groupSessions.length > 0) {
            const sessionIds = groupSessions.map(s => s.id);
            for (let i = 0; i < sessionIds.length; i += 30) {
                const chunk = sessionIds.slice(i, i + 30);
                const attendanceSnap = await db.collection('attendance')
                  .where('studentId', '==', studentId)
                  .where('sessionId', 'in', chunk)
                  .get();
                presentCount += attendanceSnap.size;
            }
          }

          return {
            studentId,
            studentName: userData?.name || 'Unknown Student',
            presentCount,
            absenceCount: Math.max(0, sessionCount - presentCount),
            attendancePercentage: sessionCount > 0 ? Number(((presentCount / sessionCount) * 100).toFixed(2)) : 0
          };
        }));

        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: groupStudentIds.length,
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
