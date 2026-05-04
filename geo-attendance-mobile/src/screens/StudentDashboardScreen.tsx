import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi, attendanceApi } from '../services/api';
import { Session } from '../types';
import { StudentTabParamList } from '../navigation/types';

type NavigationProp = BottomTabNavigationProp<StudentTabParamList, 'Dashboard'>;

const StudentDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [data, setData] = useState<{
    courses: number;
    sessions: Session[];
    feedbackStats: number;
  }>({ courses: 0, sessions: [], feedbackStats: 0 });

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const result = await studentApi.getStudentDashboard(user.id);
      setData({
        courses: result.courses?.length || 0,
        sessions: result.sessions || [],
        feedbackStats: result.feedbackCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch student dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLocationCheckin = async (sessionId: string) => {
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for check-in.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      await attendanceApi.locationCheckin({
        sessionId,
        gpsCoords: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      });

      Alert.alert('Success', 'You have checked in successfully!');
      fetchDashboard();
    } catch (error: any) {
      Alert.alert('Check-in Failed', error.message || 'Unable to verify your location.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLocationCheckout = async (sessionId: string) => {
    setCheckingIn(true); // Re-use checkingIn state for loading UI
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for check-out.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      await attendanceApi.locationCheckout({
        sessionId,
        gpsCoords: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      });

      Alert.alert('Success', 'You have checked out successfully!');
      fetchDashboard();
    } catch (error: any) {
      Alert.alert('Check-out Failed', error.message || 'Unable to verify your location.');
    } finally {
      setCheckingIn(false);
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

  // A session is considered "Done" for the student if they checked out or session ended
  const activeSessions = data.sessions.filter(s => 
    s.isActive && !s.checkedOut
  );

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

      {/* Prominent Active Session Card */}
      {activeSessions.length > 0 && (
        <View style={styles.activeSessionHero}>
          <View style={styles.activeHeroHeader}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeHeroTitle}>Active Session Found!</Text>
          </View>
          <Text style={styles.activeHeroCourse}>{activeSessions[0].courseName}</Text>
          <Text style={styles.activeHeroTime}>📍 {activeSessions[0].classroomName} • {activeSessions[0].startTime} - {activeSessions[0].endTime}</Text>
          
          <TouchableOpacity 
            style={[
                styles.heroCheckinButton, 
                checkingIn && { opacity: 0.7 },
                activeSessions[0].attended && { backgroundColor: Colors.error }
            ]}
            onPress={() => activeSessions[0].attended ? handleLocationCheckout(activeSessions[0].id) : handleLocationCheckin(activeSessions[0].id)}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={[styles.heroCheckinText, activeSessions[0].attended && { color: '#fff' }]}>
                {activeSessions[0].attended ? 'Tap here to Check-out' : 'Tap here to Check-in Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.gridContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎓</Text>
          <Text style={styles.statValue}>{data.courses}</Text>
          <Text style={styles.statLabel}>Enrolled Courses</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗓️</Text>
          <Text style={styles.statValue}>{data.sessions.length}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📝</Text>
          <Text style={styles.statValue}>{data.feedbackStats}</Text>
          <Text style={styles.statLabel}>Reviews Submitted</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Sessions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Sessions')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {data.sessions.filter(s => !s.checkedOut).length === 0 ? (
        <View style={styles.emptySessions}>
          <Text style={styles.emptyText}>No upcoming sessions for today.</Text>
        </View>
      ) : (
        data.sessions.filter(s => !s.checkedOut).slice(0, 3).map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionCourse}>{session.courseName || 'Unknown Course'}</Text>
              <Text style={styles.sessionInstructor}>👤 {session.instructorName || 'Unknown Instructor'}</Text>
              <Text style={styles.sessionTime}>{session.startTime} - {session.endTime}</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.checkinButton, 
                (!session.isActive || (session.attended && session.checkedOut) || checkingIn) && styles.checkinButtonDisabled,
                (session.isActive && !session.attended) && { backgroundColor: Colors.success },
                (session.isActive && session.attended && !session.checkedOut) && { backgroundColor: Colors.error }
              ]}
              onPress={() => session.attended ? handleLocationCheckout(session.id) : handleLocationCheckin(session.id)}
              disabled={!session.isActive || (session.attended && session.checkedOut) || checkingIn}
            >
              <Text style={styles.checkinButtonText}>
                {session.checkedOut ? '✅ Done' : (session.isActive ? (checkingIn ? 'Wait...' : (session.attended ? 'Check-out' : 'Check-in')) : 'Closed')}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
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
  activeSessionHero: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  activeHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 8,
  },
  activeHeroTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeHeroCourse: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeHeroTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  heroCheckinButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroCheckinText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.Typography.h2,
  },
  viewAllText: {
    ...Typography.Typography.label,
    color: Colors.primary,
  },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionCourse: {
    ...Typography.Typography.h3,
    marginBottom: 2,
  },
  sessionInstructor: {
    ...Typography.Typography.body,
    color: Colors.textPrimary,
    fontSize: 12,
    marginBottom: 2,
  },
  sessionTime: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  checkinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkinButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  checkinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptySessions: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
  },
});

export default StudentDashboardScreen;
