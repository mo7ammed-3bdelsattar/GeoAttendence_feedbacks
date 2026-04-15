import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { feedbackApi } from '../services/api';

interface FeedbackCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  averageRating: number;
  feedbackCount: number;
}

const InstructorFeedbackScreen: React.FC = () => {
  const { user } = useAuth();
  const [coursesFeedback, setCoursesFeedback] = useState<FeedbackCourse[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedback = async () => {
    if (!user) return;
    try {
      const data = await feedbackApi.getFeedbackByFaculty(user.id);
      setCoursesFeedback(data.courses || []);
      setOverallAvg(data.summary?.overallAverage || 0);
    } catch (error) {
      console.error('Failed to fetch instructor feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  const renderItem = ({ item }: { item: FeedbackCourse }) => (
    <View style={styles.card}>
      <Text style={styles.courseName}>{item.courseName} ({item.courseCode})</Text>
      <View style={styles.detailsRow}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Average Rating</Text>
          <Text style={styles.detailValue}>⭐ {item.averageRating.toFixed(1)} / 5.0</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Total Reviews</Text>
          <Text style={styles.detailValue}>💬 {item.feedbackCount}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Feedback</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overall Rating</Text>
            <Text style={styles.summaryValue}>⭐ {overallAvg.toFixed(1)} <Text style={{ fontSize: 16 }}>/ 5.0</Text></Text>
          </View>
          <FlatList
            data={coursesFeedback}
            keyExtractor={(item) => item.courseId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeedback(); }} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No feedback received yet.</Text>}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    ...Typography.Typography.h1,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  summaryLabel: {
    ...Typography.Typography.label,
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.Typography.display,
    color: Colors.accent,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courseName: {
    ...Typography.Typography.h3,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailBox: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  detailLabel: {
    ...Typography.Typography.label,
    fontSize: 10,
    marginBottom: 4,
  },
  detailValue: {
    ...Typography.Typography.h3,
    color: Colors.primaryLight,
  },
});

export default InstructorFeedbackScreen;
