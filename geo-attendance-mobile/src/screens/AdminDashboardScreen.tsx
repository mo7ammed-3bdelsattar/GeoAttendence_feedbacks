import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { adminApi, sessionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>(); 
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ users: 0, courses: 0, classrooms: 0, sessions: 0 });

  const fetchStats = async () => {
    try {
      const [users, courses, classrooms, sessions] = await Promise.all([
        adminApi.getUsers().catch(() => []),
        adminApi.getCourses().catch(() => []),
        adminApi.getClassrooms().catch(() => []),
        sessionApi.getSessions().catch(() => [])
      ]);
      setStats({
        users: (users || []).length,
        courses: (courses || []).length,
        classrooms: (classrooms || []).length,
        sessions: (sessions || []).length,
      });
    } catch (error: any) {
      console.error('Failed to fetch admin stats:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = (user?.name || '').split(' ').filter(Boolean).slice(0, 1).map(n => n[0]).join('').toUpperCase() || 'A';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={Colors.primary} />}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerProfile} onPress={() => navigation.navigate('Profile')}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>System Overview</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.gridContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{stats.users}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📚</Text>
          <Text style={styles.statValue}>{stats.courses}</Text>
          <Text style={styles.statLabel}>Total Courses</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏫</Text>
          <Text style={styles.statValue}>{stats.classrooms}</Text>
          <Text style={styles.statLabel}>Classrooms</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗓️</Text>
          <Text style={styles.statValue}>{stats.sessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>More Administration</Text>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Departments')}>
          <Text style={styles.actionIcon}>🏢</Text>
          <Text style={styles.actionText}>Departments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Classrooms')}>
          <Text style={styles.actionIcon}>🏫</Text>
          <Text style={styles.actionText}>Classrooms</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Enrollments')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Enrollments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('FeedbackAudit')}>
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>Feedback Audit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminReports')}>
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionText}>Attendance Analytics</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subtitle: { ...Typography.Typography.body, color: Colors.textSecondary },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  title: { ...Typography.Typography.h1 },
  logoutButton: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  logoutText: { ...Typography.Typography.label, color: Colors.accent },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '48%', marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { ...Typography.Typography.h2, color: Colors.primaryLight, marginBottom: 4 },
  statLabel: { ...Typography.Typography.label, textAlign: 'center' },
  
  sectionTitle: { ...Typography.Typography.h2, marginTop: 24, marginBottom: 16 },
  actionsContainer: { gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24, marginRight: 16 },
  actionText: { ...Typography.Typography.h3, color: Colors.textPrimary },
});

export default AdminDashboardScreen;
