import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi, attendanceApi } from '../services/api';
import type { Session } from '../types';

const StudentSessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const data = await studentApi.getStudentSessions(user.id);
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch student sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleMarkAttendance = async (sessionId: string) => {
    if (!user) return;
    setMarkingId(sessionId);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setMarkingId(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      await attendanceApi.markAttendance({
        studentId: user.id,
        sessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      Alert.alert('Success', 'Attendance marked successfully!');
      fetchSessions(); // Refresh visual status
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance. Check your location.');
    } finally {
      setMarkingId(null);
    }
  };

  const renderItem = ({ item }: { item: Session }) => {
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseName}>{item.course?.name || 'Unknown Course'}</Text>
          <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Closed'}</Text>
          </View>
        </View>
        <Text style={styles.detailText}>📅 {formattedDate}</Text>
        <Text style={styles.detailText}>📍 {item.classroom?.name || 'No Location'}</Text>
        
        {item.isActive && (
          <TouchableOpacity 
            style={[styles.button, markingId === item.id && styles.buttonDisabled]} 
            onPress={() => handleMarkAttendance(item.id)}
            disabled={markingId === item.id}
          >
            {markingId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Mark Attendance</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Sessions</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No sessions found.</Text>}
        />
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseName: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
  },
  detailText: {
    ...Typography.Typography.body,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: Colors.success + '20',
  },
  statusInactive: {
    backgroundColor: Colors.textMuted + '20',
  },
  statusText: {
    ...Typography.Typography.label,
    fontSize: 11,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StudentSessionsScreen;
