import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi, attendanceApi } from '../services/api';
import { type Session } from '../types';

const StudentSessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleLocationCheckin = async (sessionId: string) => {
    setProcessingId(sessionId);
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
      fetchSessions();
    } catch (error: any) {
      Alert.alert('Check-in Failed', error.message || 'Unable to verify your location.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLocationCheckout = async (sessionId: string) => {
    setProcessingId(sessionId);
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
      fetchSessions();
    } catch (error: any) {
      Alert.alert('Check-out Failed', error.message || 'Unable to verify your location.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: Session }) => {
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date';
    // item.attended is returned from the backend in getSessionsByStudent
    const isAttended = item.attended;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseName}>{item.courseName || item.course?.name || 'Unknown Course'}</Text>
            <Text style={styles.sessionTime}>{item.startTime} - {item.endTime}</Text>
          </View>
          <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Closed'}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
           <Text style={styles.detailText}>📅 {formattedDate}</Text>
           <Text style={styles.detailText}>👤 {item.instructorName || item.faculty?.name || 'Unknown'}</Text>
        </View>
        <Text style={styles.detailText}>📍 {item.classroomName || item.classroom?.name || 'No Location'}</Text>
        
        <View style={styles.actionArea}>
          {item.isActive ? (
            !isAttended ? (
              <TouchableOpacity
                style={[styles.button, processingId === item.id && styles.buttonDisabled]}
                onPress={() => handleLocationCheckin(item.id)}
                disabled={processingId === item.id}
              >
                {processingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Check-in via Location</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.checkoutButton, processingId === item.id && styles.buttonDisabled]}
                onPress={() => handleLocationCheckout(item.id)}
                disabled={processingId === item.id}
              >
                {processingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Check-out via Location</Text>
                )}
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.closedNote}>
               <Text style={styles.closedText}>
                 {isAttended ? '✅ Attendance Recorded' : 'Waiting for session to start'}
               </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sessions</Text>
        <Text style={styles.subtitle}>Manage your attendance</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyText}>No sessions found for your enrolled courses.</Text>
            </View>
          }
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
  header: {
    marginBottom: 24,
  },
  title: {
    ...Typography.Typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseName: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sessionTime: {
    ...Typography.Typography.label,
    color: Colors.primary,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: '#ecfdf5',
  },
  statusInactive: {
    backgroundColor: '#f9fafb',
  },
  statusText: {
    ...Typography.Typography.label,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    ...Typography.Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionArea: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButton: {
    backgroundColor: Colors.success,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closedNote: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closedText: {
    ...Typography.Typography.label,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
  }
});

export default StudentSessionsScreen;
