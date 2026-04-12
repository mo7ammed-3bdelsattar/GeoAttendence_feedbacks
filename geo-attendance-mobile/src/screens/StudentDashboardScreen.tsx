import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi } from '../services/api';

const StudentDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ courses: 0, sessions: 0, feedbackStats: 0 });

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const result = await studentApi.getStudentDashboard(user.id);
      setData({
        courses: result.courses?.length || 0,
        sessions: result.sessions?.length || 0,
        feedbackStats: result.feedbackCount || 0
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      
      <View style={styles.gridContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎓</Text>
          <Text style={styles.statValue}>{data.courses}</Text>
          <Text style={styles.statLabel}>Enrolled Courses</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗓️</Text>
          <Text style={styles.statValue}>{data.sessions}</Text>
          <Text style={styles.statLabel}>Upcoming Sessions</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📝</Text>
          <Text style={styles.statValue}>{data.feedbackStats}</Text>
          <Text style={styles.statLabel}>Reviews Submitted</Text>
        </View>
      </View>
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
