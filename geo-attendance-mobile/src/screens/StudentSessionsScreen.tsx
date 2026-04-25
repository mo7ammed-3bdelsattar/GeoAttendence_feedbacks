import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
      const visibleSessions = (data as Session[])
        .filter((session) => {
          if (!session.date) return false;
          const sessionDateTime = new Date(`${session.date}T${session.startTime || '00:00'}:00`);
          return sessionDateTime >= now || session.date === now.toISOString().slice(0, 10);
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

  // Permission handling moved to useCameraPermissions hook

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
      const respData = error.response?.data;
      if (respData?.distanceMeters !== undefined && respData?.allowedRadiusMeters !== undefined) {
        Alert.alert(
          'Attendance Failed',
          `You are ${respData.distanceMeters} meters away from the classroom. You must be within ${respData.allowedRadiusMeters} meters to register.`
        );
      } else {
        Alert.alert('Error', respData?.error || 'Failed to mark attendance. Check your location.');
      }
    } finally {
      setMarkingId(null);
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
                style={[styles.button, scannerSessionId === item.id && styles.buttonDisabled]}
                onPress={() => openScanner(item.id, 'checkin')}
                disabled={scannerSessionId === item.id}
              >
                <Text style={styles.buttonText}>Scan QR to Check In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, scannerSessionId === item.id && styles.buttonDisabled, { backgroundColor: Colors.success }]}
                onPress={() => openScanner(item.id, 'checkout')}
                disabled={scannerSessionId === item.id}
              >
                <Text style={styles.buttonText}>Scan QR to Check Out</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.detailText, { color: Colors.textMuted }]}>Waiting for instructor to start the session.</Text>
          </View>
        )}
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

      <Modal visible={scannerVisible} animationType="slide" transparent onRequestClose={closeScanner}>
        <View style={styles.modalOverlay}>
          <View style={styles.scannerContainer}>
            <Text style={styles.scannerTitle}>{scannerMode === 'checkout' ? 'Scan QR to Check Out' : 'Scan QR to Check In'}</Text>
            <View style={styles.scannerBox}>
              {!permission?.granted ? (
                <Text style={styles.detailText}>Camera access is required to scan the session QR code.</Text>
              ) : (
                <CameraView 
                  onBarcodeScanned={handleBarCodeScanned} 
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  style={StyleSheet.absoluteFillObject} 
                />
              )}
            </View>
            <TouchableOpacity style={styles.scannerClose} onPress={closeScanner}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  autoButton: {
    marginTop: 0,
    marginBottom: 16,
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  scannerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  scannerTitle: {
    ...Typography.Typography.h3,
    marginBottom: 12,
    textAlign: 'center',
  },
  scannerBox: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  scannerClose: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default StudentSessionsScreen;
