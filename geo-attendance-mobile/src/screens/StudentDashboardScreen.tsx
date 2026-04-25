import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Modal, Pressable, useWindowDimensions } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { attendanceApi, feedbackApi, sessionApi, studentApi } from '../services/api';
import type { Course, Feedback, Session } from '../types';

const StudentDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 1024;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    weeklyAttendanceCount: 0,
    feedbackCount: 0,
    courses: 0,
    sessions: 0,
  });
  const [attendedSessions, setAttendedSessions] = useState<Session[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<Feedback[]>([]);
  const [courseNameMap, setCourseNameMap] = useState<Record<string, string>>({});

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const [result, allSessions, feedback] = await Promise.all([
        studentApi.getStudentDashboard(user.id),
        sessionApi.getSessions().catch(() => []),
        feedbackApi.getFeedbackByStudent(user.id).catch(() => [])
      ]);

      const sessions: Session[] = (allSessions as Session[]) || [];
      const courses: Course[] = result.courses || [];
      const courseLookup = courses.reduce<Record<string, string>>((acc, course) => {
        acc[course.id] = course.name;
        return acc;
      }, {});
      setCourseNameMap(courseLookup);
      setFeedbackRows(feedback || []);

      const attendanceRows = await Promise.allSettled(
        sessions.map(async (session) => {
          const response = await attendanceApi.getSessionAttendance(session.id);
          const attended = (response.records || []).some(
            (record: any) => record.studentId === user.id && (record.status === 'present' || record.status === 'late')
          );
          return attended ? session : null;
        })
      );

      const attended = attendanceRows
        .filter((row): row is PromiseFulfilledResult<Session | null> => row.status === 'fulfilled')
        .map((row) => row.value)
        .filter((row): row is Session => Boolean(row));

      setAttendedSessions(attended);

      const totalLectures = sessions.length;
      const attendancePercentage = totalLectures > 0
        ? Math.round((attended.length / totalLectures) * 100)
        : 0;
      const weekStart = getWeekStart();
      const weeklyAttendanceCount = attended.filter((session) => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate >= weekStart;
      }).length;

      setStats({
        attendancePercentage,
        weeklyAttendanceCount,
        feedbackCount: feedback?.length || result.feedbackCount || 0,
        courses: courses.length,
        sessions: sessions.length,
      });
    } catch (error) {
      console.error('Failed to fetch student dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonGrid}>
          <View style={styles.skeletonStat} />
          <View style={styles.skeletonStat} />
          <View style={styles.skeletonStat} />
        </View>
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor={Colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Hello, {user?.name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Welcome back to GeoAttend!</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.contentRow, isWideScreen && styles.contentRowWide]}>
        <View style={[styles.mainColumn, isWideScreen && styles.mainColumnWide]}>
          <View style={styles.gridContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🎓</Text>
              <Text style={styles.statValue}>{stats.courses}</Text>
              <Text style={styles.statLabel}>Enrolled Courses</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🗓️</Text>
              <Text style={styles.statValue}>{stats.sessions}</Text>
              <Text style={styles.statLabel}>Upcoming Sessions</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📍</Text>
              <Text style={styles.statValue}>{stats.attendancePercentage}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sideColumn, isWideScreen && styles.sideColumnWide]}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.summaryCard}
            onPress={() => setDetailsModalOpen(true)}
          >
            <Text style={styles.summaryTitle}>Attendance Snapshot</Text>
            <Text style={styles.summarySubtitle}>Your attendance and feedback progress.</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>Attendance %</Text>
                <Text style={styles.summaryValue}>{stats.attendancePercentage}%</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>This Week</Text>
                <Text style={styles.summaryValue}>{stats.weeklyAttendanceCount}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>Feedbacks</Text>
                <Text style={styles.summaryValue}>{stats.feedbackCount}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.detailsButton} onPress={() => setDetailsModalOpen(true)}>
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={detailsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailsModalOpen(false)} />
        <View style={styles.detailsPanel}>
          <View style={styles.detailsHeader}>
            <View>
              <Text style={styles.detailsHeaderTitle}>Attendance Details</Text>
              <Text style={styles.detailsHeaderSubtitle}>Lectures attended and submitted feedback.</Text>
            </View>
            <TouchableOpacity onPress={() => setDetailsModalOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Attended Lectures</Text>
            {attendedSessions.length === 0 ? (
              <Text style={styles.emptyText}>No attendance yet. Attend your first lecture and it will appear here.</Text>
            ) : (
              attendedSessions.map((session) => (
                <View key={session.id} style={styles.detailCard}>
                  <Text style={styles.detailHeading}>{session.course?.name || 'Unknown Lecture'}</Text>
                  <Text style={styles.detailMeta}>
                    {session.date ? new Date(session.date).toLocaleDateString() : 'No date'} | {session.startTime || '--:--'} - {session.endTime || '--:--'}
                  </Text>
                  <Text style={styles.detailMeta}>Location: {session.classroom?.name || 'Not specified'}</Text>
                </View>
              ))
            )}

            <Text style={[styles.detailsTitle, { marginTop: 16 }]}>Submitted Feedbacks</Text>
            {feedbackRows.length === 0 ? (
              <Text style={styles.emptyText}>No feedback yet. Submit feedback after lectures to see it here.</Text>
            ) : (
              feedbackRows.map((item) => (
                <View key={item.id} style={styles.detailCard}>
                  <Text style={styles.detailHeading}>{courseNameMap[item.courseId] || item.courseName || 'Unknown Lecture'}</Text>
                  <Text style={styles.detailMeta}>Rating: {item.rating}/5</Text>
                  <Text style={styles.detailBody}>{item.message?.trim() || 'No written feedback provided.'}</Text>
                  <Text style={styles.detailDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Date unavailable'}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonCard: {
    marginTop: 40,
    height: 110,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
  },
  skeletonGrid: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonStat: {
    width: '31%',
    height: 100,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
  },
  title: {
    ...Typography.Typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  logoutButton: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    ...Typography.Typography.label,
    color: Colors.accent,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contentRow: {
    gap: 12,
  },
  contentRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    width: '100%',
  },
  mainColumnWide: {
    flex: 1,
    width: undefined,
  },
  sideColumn: {
    width: '100%',
  },
  sideColumnWide: {
    width: 360,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  summaryTitle: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
  },
  summarySubtitle: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: Colors.surfaceLight,
  },
  summaryLabel: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.Typography.h3,
    marginTop: 6,
    color: Colors.primaryLight,
  },
  detailsButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  detailsButtonText: {
    ...Typography.Typography.label,
    color: '#fff',
  },
  detailsContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  detailsPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  detailsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsHeaderTitle: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
  },
  detailsHeaderSubtitle: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  closeButtonText: {
    ...Typography.Typography.label,
    color: Colors.textPrimary,
  },
  detailsTitle: {
    ...Typography.Typography.h3,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailHeading: {
    ...Typography.Typography.label,
    color: Colors.textPrimary,
  },
  detailMeta: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  detailBody: {
    ...Typography.Typography.body,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  detailDate: {
    ...Typography.Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 6,
  },
  emptyText: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    ...Typography.Typography.h2,
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.Typography.label,
    textAlign: 'center',
  },
});

export default StudentDashboardScreen;
