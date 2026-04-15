import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { feedbackApi } from '../services/api';
import type { Feedback } from '../types/feedback'; // Check if we should import from types or services

const AdminFeedbackAuditScreen: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      const data = await feedbackApi.getAllFeedback();
      setFeedbacks(data);
    } catch (error) {
      console.error('Failed to fetch feedback audit:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No Date';
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.rating}>⭐ {item.rating} / 5</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <Text style={styles.courseName}>Course ID: {item.courseId}</Text>
        {item.message ? <Text style={styles.message}>"{item.message}"</Text> : <Text style={styles.message}>No comments provided.</Text>}
        <Text style={styles.student}>From Student: {item.studentId}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feedback Audit</Text>
      <Text style={styles.subtitle}>All system feedback</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={feedbacks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeedbacks(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No feedbacks found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  title: { ...Typography.Typography.h1, marginBottom: 4 },
  subtitle: { ...Typography.Typography.body, color: Colors.textSecondary, marginBottom: 20 },
  
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rating: { ...Typography.Typography.h2, color: Colors.accent },
  date: { ...Typography.Typography.bodySmall, color: Colors.textMuted },
  
  courseName: { ...Typography.Typography.label, color: Colors.primaryLight, marginBottom: 8 },
  message: { ...Typography.Typography.body, fontStyle: 'italic', marginBottom: 12 },
  student: { ...Typography.Typography.bodySmall, color: Colors.textMuted },
});

export default AdminFeedbackAuditScreen;
