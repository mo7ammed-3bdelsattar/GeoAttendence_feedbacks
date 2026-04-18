import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { sessionApi } from '../services/api';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import type { Session } from '../types';

const FacultySessionScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<Session | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await sessionApi.getSessionsForFaculty(user.id);
      setSessions(data);
    } catch (error: any) {
      console.error('Failed to fetch faculty sessions:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStartSession = async (session: Session) => {
    setActionLoading(true);
    try {
      await sessionApi.startSessionById(session.id);
      Alert.alert('✅ Session Started', `"${session.course?.name || 'Session'}" is now active. Students can check in.`);
      setActiveModal(null);
      fetchSessions();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to start session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = (session: Session) => {
    Alert.alert(
      'End Session',
      `Are you sure you want to end "${session.course?.name || 'this session'}"? Students will no longer be able to check in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await sessionApi.endSession(session.id);
              Alert.alert('✅ Session Ended', 'The session has been closed.');
              setActiveModal(null);
              fetchSessions();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to end session.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Session }) => {
    const formattedDate = item.date
      ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'No Date';

    return (
      <TouchableOpacity style={styles.card} onPress={() => setActiveModal(item)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <Text style={styles.courseName} numberOfLines={1}>
            {item.course?.name || 'Unknown Course'}
          </Text>
          <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.textMuted }]}>
              {item.isActive ? '● Live' : '○ Closed'}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>📅 {formattedDate}</Text>
        {item.classroom?.name && <Text style={styles.meta}>📍 {item.classroom.name}</Text>}

        <View style={styles.actionRow}>
          {item.isActive ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => handleEndSession(item)}
            >
              <Text style={styles.btnText}>⏹ End Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleStartSession(item)}
            >
              <Text style={styles.btnText}>▶ Start Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Sessions</Text>
      <Text style={styles.subtitle}>View and manage your scheduled classes.</Text>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchSessions(); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No sessions assigned yet.</Text>
              <Text style={styles.emptySubText}>Sessions assigned to you by the admin will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Session Detail Modal */}
      <Modal visible={!!activeModal} animationType="slide" transparent onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{activeModal?.course?.name || 'Session Details'}</Text>
            <View style={[styles.badge, activeModal?.isActive ? styles.badgeActive : styles.badgeInactive, { alignSelf: 'center', marginBottom: 16 }]}>
              <Text style={[styles.badgeText, { color: activeModal?.isActive ? Colors.success : Colors.textMuted }]}>
                {activeModal?.isActive ? '● Currently Live' : '○ Not Started'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 Date</Text>
              <Text style={styles.detailValue}>
                {activeModal?.date ? new Date(activeModal.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📍 Location</Text>
              <Text style={styles.detailValue}>{activeModal?.classroom?.name || 'Not assigned'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🎓 Course Code</Text>
              <Text style={styles.detailValue}>{activeModal?.course?.code || 'N/A'}</Text>
            </View>

            <View style={styles.modalActions}>
              {activeModal?.isActive ? (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger, { flex: 1 }]}
                  onPress={() => activeModal && handleEndSession(activeModal)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>⏹ End Session</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={() => activeModal && handleStartSession(activeModal)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>▶ Start Session</Text>}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { flex: 1 }]}
                onPress={() => setActiveModal(null)}
              >
                <Text style={[styles.btnText, { color: Colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseName: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: Colors.success + '20',
  },
  badgeInactive: {
    backgroundColor: Colors.textMuted + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    ...Typography.Typography.bodySmall,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    flex: 1,
  },
  btnDanger: {
    backgroundColor: Colors.error,
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    ...Typography.Typography.h3,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubText: {
    ...Typography.Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    ...Typography.Typography.h2,
    textAlign: 'center',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    ...Typography.Typography.body,
    color: Colors.textMuted,
  },
  detailValue: {
    ...Typography.Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
});

export default FacultySessionScreen;