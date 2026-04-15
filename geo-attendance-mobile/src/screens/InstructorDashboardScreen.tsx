import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { adminApi, feedbackApi } from '../services/api';

const InstructorDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseCount, setCourseCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const [allCourses, feedbackData] = await Promise.all([
        adminApi.getCourses(),
        feedbackApi.getFeedbackByFaculty(user.id).catch(() => ({ summary: { totalFeedbacks: 0 } }))
      ]);
      const myCourses = allCourses.filter(c => c.facultyId === user.id);
      setCourseCount(myCourses.length);
      setFeedbackCount(feedbackData?.summary?.totalFeedbacks || 0);
    } catch (error) {
      console.error('Failed to fetch instructor dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor={Colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Welcome, {user?.name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Here is your overview</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.gridContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📚</Text>
          <Text style={styles.statValue}>{courseCount}</Text>
          <Text style={styles.statLabel}>Assigned Courses</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statValue}>{feedbackCount}</Text>
          <Text style={styles.statLabel}>Feedback Received</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { ...Typography.Typography.h1, marginBottom: 4 },
  subtitle: { ...Typography.Typography.body, color: Colors.textSecondary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  logoutButton: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  logoutText: { ...Typography.Typography.label, color: Colors.accent },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '48%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { ...Typography.Typography.h2, color: Colors.primaryLight, marginBottom: 4 },
  statLabel: { ...Typography.Typography.label, textAlign: 'center' },
});

export default InstructorDashboardScreen;
