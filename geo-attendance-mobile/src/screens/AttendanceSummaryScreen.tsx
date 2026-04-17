import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Colors from '../theme/colors';
import { Spacing } from '../theme/typography';

interface AttendanceSummary {
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  checkedInOnly: number;
  checkedInAndOut: number;
  students: Array<{
    studentId: string;
    studentName?: string;
    checkInAt: any;
    checkOutAt: any;
    status: string;
  }>;
}

const AttendanceSummaryScreen: React.FC = () => {
  const route = useRoute();
  const { sessionId } = route.params as { sessionId: string };
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summaryDoc = await getDoc(doc(db, 'sessions', sessionId, 'attendanceSummary', 'summary'));
        if (summaryDoc.exists()) {
          setSummary(summaryDoc.data() as AttendanceSummary);
        }
      } catch (error) {
        console.error('Fetch summary error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text>Summary not available</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT_FULL': return '#28a745';
      case 'PRESENT_NO_CHECKOUT': return '#ffc107';
      case 'ABSENT': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PRESENT_FULL': return 'حضور كامل';
      case 'PRESENT_NO_CHECKOUT': return 'حضور بس';
      case 'ABSENT': return 'غائب';
      default: return status;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ملخص الحضور</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          ✅ {summary.checkedInAndOut} حضروا كامل | ⚠️ {summary.checkedInOnly} دخلوا بس | ❌ {summary.totalAbsent} غابوا
        </Text>
      </View>

      <FlatList
        data={summary.students}
        keyExtractor={(item) => item.studentId}
        renderItem={({ item }) => (
          <View style={styles.studentRow}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.studentName || item.studentId}</Text>
              <Text style={styles.times}>
                دخول: {formatTime(item.checkInAt)} | خروج: {formatTime(item.checkOutAt)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.medium,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.medium,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: Spacing.medium,
    borderRadius: 8,
    marginBottom: Spacing.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    fontSize: 16,
    textAlign: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: Spacing.medium,
    marginBottom: Spacing.small,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  times: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AttendanceSummaryScreen;