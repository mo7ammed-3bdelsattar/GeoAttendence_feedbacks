import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { adminApi, sessionApi } from '../services/api';

const InstructorSessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionQrs, setSessionQrs] = useState<Record<string, { token: string; expiresAt: string }>>({});
  const [activeSessionOp, setActiveSessionOp] = useState<string | null>(null);
  const [liveQrSessionId, setLiveQrSessionId] = useState<string | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<{ attended: any[], absent: any[] }>({ attended: [], absent: [] });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const [sessionData, courseData] = await Promise.all([
        sessionApi.getSessions({ facultyId: user.id }),
        adminApi.getCourses(),
      ]);

      const mapped = sessionData.map((session: any) => {
        const course = courseData.find((item: any) => item.id === session.courseId);
        return {
          ...session,
          courseName: course?.name || session.courseName || 'Unknown Course',
          courseCode: course?.code || session.courseCode || 'N/A',
        };
      });

      setSessions(mapped);
    } catch (error) {
      console.error('Failed to fetch instructor sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      await sessionApi.startSessionById(sessionId);
      setSessions((prev) => prev.map((session) =>
        session.id === sessionId ? { ...session, status: 'active', startedAt: new Date().toISOString(), checkInDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : session
      ));
      await handleFetchQr(sessionId);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setActiveSessionOp(null);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      await sessionApi.endSession(sessionId);
      setSessions((prev) => prev.map((session) =>
        session.id === sessionId ? { ...session, status: 'ended' } : session
      ));
      setSessionQrs((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
      if (liveQrSessionId === sessionId) {
        setLiveQrSessionId(null);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setActiveSessionOp(null);
    }
  };

  const handleFetchQr = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      const qr = await sessionApi.getSessionQr(sessionId);
      setSessionQrs((prev) => ({ ...prev, [sessionId]: qr }));
    } catch (error) {
      console.error('Failed to fetch QR:', error);
    } finally {
      setActiveSessionOp(null);
    }
  };

  const handleOpenSummary = async (sessionId: string) => {
    setSummaryLoading(true);
    setSummaryVisible(true);
    try {
      const summary = await sessionApi.getSessionSummary(sessionId);
      const students = summary?.students || [];
      setSummaryData({
        attended: students.filter((s: any) => s.status !== 'ABSENT'),
        absent: students.filter((s: any) => s.status === 'ABSENT'),
      });
    } catch (error) {
      console.error('Failed to load session summary:', error);
      setSummaryData({ attended: [], absent: [] });
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  useEffect(() => {
    if (!liveQrSessionId) return;
    const timer = setInterval(() => {
      handleFetchQr(liveQrSessionId);
    }, 30000);
    return () => clearInterval(timer);
  }, [liveQrSessionId]);

  const renderItem = ({ item }: { item: any }) => {
    const isActive = item.status === 'active';
    const qr = sessionQrs[item.id];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseCode}>{item.courseCode || 'N/A'}</Text>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>{isActive ? 'Active' : item.status || 'Scheduled'}</Text>
          </View>
        </View>
        <Text style={styles.courseName}>{item.courseName || item.topic || 'Untitled Session'}</Text>
        <Text style={styles.detailText}>📅 {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</Text>
        <Text style={styles.detailText}>📍 {item.classroomName || item.classroomId || 'Unknown location'}</Text>
        <Text style={styles.detailText}>⏰ {item.startTime || '--'} to {item.endTime || '--'}</Text>

        <View style={styles.actionRow}>
          {isActive ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, activeSessionOp === item.id && styles.buttonDisabled]}
                onPress={() => {
                  setLiveQrSessionId(item.id);
                  handleFetchQr(item.id);
                }}
                disabled={activeSessionOp === item.id}
              >
                <Text style={styles.actionButtonText}>{activeSessionOp === item.id ? 'Loading QR…' : 'Show QR'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.endButton, activeSessionOp === item.id && styles.buttonDisabled]}
                onPress={() => handleEndSession(item.id)}
                disabled={activeSessionOp === item.id}
              >
                <Text style={styles.actionButtonText}>End Session</Text>
              </TouchableOpacity>
            </>
          ) : item.status !== 'ended' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton, activeSessionOp === item.id && styles.buttonDisabled]}
              onPress={() => handleStartSession(item.id)}
              disabled={activeSessionOp === item.id}
            >
              <Text style={styles.actionButtonText}>{activeSessionOp === item.id ? 'Starting…' : 'Start Session'}</Text>
            </TouchableOpacity>
          ) : null}
          
          {(item.status === 'ended' || isActive) ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.summaryButton]}
              onPress={() => handleOpenSummary(item.id)}
            >
              <Text style={styles.actionButtonText}>Attendance List</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {qr && isActive ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Instructor QR code</Text>
            <Text style={styles.qrSubtitle}>Students scan this code to check in and out.</Text>
            <View style={styles.qrImageWrapper}>
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.token)}` }}
                style={styles.qrImage}
              />
            </View>
            <Text style={styles.qrExpiry}>Expires at {new Date(qr.expiresAt).toLocaleTimeString()}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Teaching Sessions</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No sessions assigned to you yet.</Text>}
        />
      )}
      <Modal visible={summaryVisible} animationType="slide" transparent onRequestClose={() => setSummaryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attendance Summary</Text>
            {summaryLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <ScrollView style={{ maxHeight: '90%' }}>
                <Text style={styles.sectionHeaderLabel}>Present ({summaryData.attended.length})</Text>
                {summaryData.attended.map((item: any) => (
                  <View key={item.studentId} style={styles.summaryRow}>
                    <View style={styles.rowTop}>
                      <View style={[styles.indicator, { backgroundColor: Colors.success }]} />
                      <Text style={styles.summaryName}>{item.studentName}</Text>
                    </View>
                    <Text style={styles.summaryMeta}>In: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : '--'} | Out: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : '--'}</Text>
                  </View>
                ))}
                
                <Text style={[styles.sectionHeaderLabel, { marginTop: 20 }]}>Absent ({summaryData.absent.length})</Text>
                {summaryData.absent.map((item: any) => (
                  <View key={item.studentId} style={styles.summaryRow}>
                    <View style={styles.rowTop}>
                      <View style={[styles.indicator, { backgroundColor: Colors.error }]} />
                      <Text style={styles.summaryName}>{item.studentName}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.actionButton, styles.startButton, { marginTop: 16 }]} onPress={() => setSummaryVisible(false)}>
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  title: { ...Typography.Typography.h1, marginBottom: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCode: { ...Typography.Typography.label, color: Colors.primaryLight },
  courseName: { ...Typography.Typography.h3, color: Colors.textPrimary, marginBottom: 12 },
  detailText: { ...Typography.Typography.body, color: Colors.textMuted, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { ...Typography.Typography.label, fontSize: 11 },
  statusActive: { backgroundColor: Colors.success + '20' },
  statusInactive: { backgroundColor: Colors.textMuted + '10' },
  statusActiveText: { color: Colors.success },
  statusInactiveText: { color: Colors.textMuted },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginRight: 10, marginBottom: 10 },
  buttonDisabled: { opacity: 0.7 },
  actionButtonText: { color: Colors.textPrimary, fontWeight: '700' },
  startButton: { backgroundColor: Colors.primary, borderColor: Colors.primary, },
  endButton: { backgroundColor: Colors.error, borderColor: Colors.error, },
  summaryButton: { backgroundColor: Colors.success, borderColor: Colors.success },
  qrCard: { marginTop: 16, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  qrTitle: { ...Typography.Typography.h3, marginBottom: 6, color: Colors.textPrimary },
  qrSubtitle: { ...Typography.Typography.body, color: Colors.textMuted, marginBottom: 10 },
  qrImageWrapper: { minHeight: 120, borderRadius: 14, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 16, marginBottom: 10 },
  qrImage: { width: 180, height: 180, borderRadius: 16 },
  qrImageText: { ...Typography.Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  qrExpiry: { ...Typography.Typography.label, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, maxHeight: '85%' },
  modalTitle: { ...Typography.Typography.h3, marginBottom: 12, color: Colors.textPrimary },
  summaryRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryName: { ...Typography.Typography.body, color: Colors.textPrimary, fontWeight: '700' },
  summaryMeta: { ...Typography.Typography.label, color: Colors.textSecondary, marginTop: 2 },
  sectionHeaderLabel: { ...Typography.Typography.label, color: Colors.primary, fontSize: 14, fontWeight: 'bold' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  indicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
});
export default InstructorSessionsScreen;