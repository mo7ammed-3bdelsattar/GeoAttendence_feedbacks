import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { sessionApi, attendanceApi } from '../services/api';
import { type Session } from '../types';

const StudentSessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerMode, setScannerMode] = useState<'checkin' | 'checkout' | null>(null);
  const [scannerSessionId, setScannerSessionId] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [checkedInSessions, setCheckedInSessions] = useState<Record<string, boolean>>({});
  const [autoChecking, setAutoChecking] = useState(false);

  const calculateDistanceMeters = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(toLat - fromLat);
    const dLng = toRad(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const data = await sessionApi.getSessions();
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local
      
      const visibleSessions = (data as Session[])
        .filter((session) => {
          if (!session.date) return false;
          // Show if it's today (any time) or in the future
          return session.date >= todayStr;
        })
        .sort((a, b) => {
          const left = new Date(`${a.date || ''}T${a.startTime || '00:00'}:00`).getTime();
          const right = new Date(`${b.date || ''}T${b.startTime || '00:00'}:00`).getTime();
          return left - right;
        });
      setSessions(visibleSessions);
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

  const handleAutoCheckInNearby = async () => {
    if (!user) return;
    const activeSessions = sessions.filter((session) => Boolean(session.isActive) && !session.attended);
    if (activeSessions.length === 0) {
      Alert.alert('No Active Sessions', 'There are no active lectures available for check-in right now.');
      return;
    }

    setAutoChecking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Needed', 'Please allow location access to use automatic nearby check-in.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let successCount = 0;

      for (const session of activeSessions) {
        const classroom = session.classroom as (typeof session.classroom & { lat?: number; lng?: number; geofenceRadiusMeters?: number }) | undefined;
        const lectureLat = classroom?.latitude ?? classroom?.lat;
        const lectureLng = classroom?.longitude ?? classroom?.lng;
        const radiusMeters = classroom?.geofenceRadiusMeters ?? 150;

        if (typeof lectureLat === 'number' && typeof lectureLng === 'number') {
          const distance = calculateDistanceMeters(
            location.coords.latitude,
            location.coords.longitude,
            lectureLat,
            lectureLng
          );
          if (distance > radiusMeters) {
            continue;
          }
        }

        try {
          await attendanceApi.markAttendance({
            studentId: user.id,
            sessionId: session.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          successCount += 1;
          setSessions((prev) => prev.map((row) => (row.id === session.id ? { ...row, attended: true } : row)));
        } catch {
          // Backend geofence/session validation is the source of truth.
        }
      }

      if (successCount > 0) {
        Alert.alert('Checked In', `Attendance marked for ${successCount} active lecture(s).`);
      } else {
        Alert.alert(
          'No Nearby Active Lecture',
          'You are currently outside the allowed geofence radius for active lectures.'
        );
      }
    } catch {
      Alert.alert('Location Error', 'Unable to get your location right now. Please try manual check-in.');
    } finally {
      setAutoChecking(false);
    }
  };

  const openScanner = async (sessionId: string, mode: 'checkin' | 'checkout') => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to scan QR codes.');
        return;
      }
    }
    setScannerSessionId(sessionId);
    setScannerMode(mode);
    setScannerVisible(true);
  };

  const closeScanner = () => {
    setScannerVisible(false);
    setScannerMode(null);
    setScannerSessionId(null);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scannerMode || !scannerSessionId || !user) {
      closeScanner();
      return;
    }

    if (!permission?.granted) {
      Alert.alert('Camera permission denied', 'Cannot scan without camera permission.');
      closeScanner();
      return;
    }

    setScannerVisible(false);
    const sessionId = scannerSessionId;
    const qrToken = data;

    if (scannerMode === 'checkin') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});

        await attendanceApi.studentCheckin({
          qrToken,
          gpsCoords: {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          },
        });

        setCheckedInSessions((prev) => ({ ...prev, [sessionId]: true }));
        setSessions((prev) => prev.map((session) =>
          session.id === sessionId ? { ...session, isActive: true } : session
        ));
        Alert.alert('Checked in', 'You have checked in successfully.');
      } catch (error: any) {
        Alert.alert('Check-in failed', error.message || error.response?.data?.message || 'Unable to check in using the scanned QR.');
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        await attendanceApi.studentCheckout({
          qrToken,
          gpsCoords: {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          },
        });
        setCheckedInSessions((prev) => ({ ...prev, [sessionId]: false }));
        Alert.alert('Checked out', 'You have successfully checked out.');
      } catch (error: any) {
        Alert.alert('Check-out failed', error.message || error.response?.data?.message || 'Unable to check out using the scanned QR.');
      }
    }
  };

  const renderItem = ({ item }: { item: Session }) => {
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date';
    // item.attended is returned from the backend in getSessionsByStudent
    const isAttended = item.attended;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseName} numberOfLines={2}>
            {item.course?.name || 'Unknown Course'}
          </Text>
          <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Closed'}</Text>
          </View>
        </View>
        <Text style={styles.detailText}>📅 {formattedDate}</Text>
        <Text style={styles.detailText} numberOfLines={2}>
          📍 {item.classroom?.name || 'No Location'}
        </Text>
        
        {item.isActive ? (
          <View style={{ marginTop: 16 }}>
            {!item.attended && (
              <TouchableOpacity
                style={[styles.button, markingId === item.id && styles.buttonDisabled]}
                onPress={() => handleMarkAttendance(item.id)}
                disabled={markingId === item.id}
              >
                <Text style={styles.buttonText}>
                  {markingId === item.id ? 'Checking location...' : 'Check In by Location'}
                </Text>
              </TouchableOpacity>
            )}
            {!checkedInSessions[item.id] ? (
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
      <Text style={styles.title}>My Sessions</Text>
      <TouchableOpacity
        style={[styles.button, styles.autoButton, autoChecking && styles.buttonDisabled]}
        onPress={handleAutoCheckInNearby}
        disabled={autoChecking}
      >
        <Text style={styles.buttonText}>
          {autoChecking ? 'Checking nearby lectures...' : 'Auto Check-In Nearby'}
        </Text>
      </TouchableOpacity>
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    flex: 1,
    marginRight: 10,
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
    marginTop: 16,
  },
  autoButton: {
    marginTop: 0,
    marginBottom: 16,
    backgroundColor: Colors.accent,
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
