import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const InstructorReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const loadReport = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/reports/instructor/${user.id}`);
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to load instructor reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return Colors.success;
    if (percentage >= 50) return Colors.accent;
    return Colors.error;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport(); }} tintColor={Colors.primary} />}
    >
      <Text style={styles.title}>Attendance Report</Text>
      <Text style={styles.subtitle}>Detailed analytics grouped by Course & Group</Text>

      {(!data || !data.courses || data.courses.length === 0) ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No report data available yet.</Text>
        </View>
      ) : (
        data.courses.map((course: any) => (
          <View key={course.courseId} style={styles.courseContainer}>
            <TouchableOpacity 
              style={styles.courseHeader}
              onPress={() => setExpandedCourse(expandedCourse === course.courseId ? null : course.courseId)}
            >
              <View>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseName}>{course.courseName}</Text>
              </View>
              <Text style={styles.expandIcon}>{expandedCourse === course.courseId ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {expandedCourse === course.courseId && (
              <View style={styles.groupsList}>
                {course.groups.map((group: any) => (
                  <View key={group.groupId} style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupTitle}>Group: {group.groupName}</Text>
                      <Text style={styles.groupMeta}>{group.studentCount} Students | {group.sessionCount} Sessions</Text>
                    </View>

                    <View style={styles.studentsTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.columnLabel, { flex: 2 }]}>Student Name</Text>
                        <Text style={[styles.columnLabel, { flex: 1, textAlign: 'center' }]}>Abs.</Text>
                        <Text style={[styles.columnLabel, { flex: 1, textAlign: 'right' }]}>Attend%</Text>
                      </View>

                      {group.students.map((student: any) => (
                        <View key={student.studentId} style={styles.tableRow}>
                          <Text style={[styles.studentName, { flex: 2 }]} numberOfLines={1}>{student.studentName}</Text>
                          <Text style={[styles.absenceCount, { flex: 1, textAlign: 'center' }]}>{student.absenceCount}</Text>
                          <Text style={[
                            styles.percentageText, 
                            { flex: 1, textAlign: 'right', color: getAttendanceColor(student.attendancePercentage) }
                          ]}>
                            {student.attendancePercentage}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { ...Typography.Typography.h1, marginBottom: 4 },
  subtitle: { ...Typography.Typography.body, color: Colors.textSecondary, marginBottom: 24 },
  courseContainer: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  courseHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  courseCode: { ...Typography.Typography.label, color: Colors.primary, fontWeight: 'bold' },
  courseName: { ...Typography.Typography.h3, marginTop: 2 },
  expandIcon: { fontSize: 12, color: Colors.textMuted },
  groupsList: { padding: 12, backgroundColor: Colors.background + '50' },
  groupCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupHeader: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
  groupTitle: { ...Typography.Typography.h3, fontSize: 16 },
  groupMeta: { ...Typography.Typography.label, color: Colors.textMuted, marginTop: 2 },
  studentsTable: { marginTop: 4 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '50' },
  columnLabel: { ...Typography.Typography.label, fontSize: 10, color: Colors.textSecondary, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '20', alignItems: 'center' },
  studentName: { ...Typography.Typography.body, fontSize: 13, color: Colors.textPrimary },
  absenceCount: { ...Typography.Typography.body, fontSize: 13, color: Colors.error },
  percentageText: { ...Typography.Typography.body, fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { ...Typography.Typography.body, color: Colors.textSecondary },
});

export default InstructorReportsScreen;