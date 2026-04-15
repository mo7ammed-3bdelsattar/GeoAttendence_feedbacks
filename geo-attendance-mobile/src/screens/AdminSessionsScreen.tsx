import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { sessionApi, adminApi, User } from '../services/api';
import type { Session, Course, Classroom } from '../types';

const AdminSessionsScreen: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [sessionId, setSessionId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  // Helper modals for selection
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [selectType, setSelectType] = useState<'course'|'faculty'|'classroom' | null>(null);

  const fetchData = async () => {
    try {
      const [sessionsData, coursesData, usersData, classroomsData] = await Promise.all([
        sessionApi.getSessions(),
        adminApi.getCourses(),
        adminApi.getUsers('faculty'),
        adminApi.getClassrooms()
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
      setFaculties(usersData);
      setClassrooms(classroomsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setSessionId('');
    setCourseId('');
    setFacultyId('');
    setClassroomId('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsActive(true);
    setModalVisible(true);
  };

  const openEditModal = (session: Session) => {
    setIsEditing(true);
    setSessionId(session.id);
    setCourseId(session.courseId);
    setFacultyId(session.facultyId);
    setClassroomId(session.classroomId || '');
    setDate(session.date ? session.date.split('T')[0] : '');
    setIsActive(session.isActive);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await sessionApi.deleteSession(id);
          Alert.alert('Success', 'Session deleted');
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete session');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!courseId || !facultyId || !date) {
      Alert.alert('Error', 'Course, Faculty, and Date are required');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = { courseId, facultyId, classroomId, date, isActive };
      if (isEditing) {
        await sessionApi.updateSession(sessionId, payload);
        Alert.alert('Success', 'Session updated');
      } else {
        await sessionApi.createSession(payload);
        Alert.alert('Success', 'Session created');
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Session }) => {
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date';
    return (
      <View style={styles.card}>
        <View style={{flex: 1}}>
          <View style={styles.cardHeader}>
            <Text style={styles.courseName}>{item.course?.name || 'Unknown Course'}</Text>
            <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Closed'}</Text>
            </View>
          </View>
          <Text style={styles.facultyName}>Instructor: {item.faculty?.name || 'Unknown'}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>📅 {formattedDate}</Text>
            {item.classroom?.name && <Text style={styles.detailText}>📍 {item.classroom.name}</Text>}
          </View>
        </View>
        <View style={styles.actionsBox}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.error + '20' }]} onPress={() => handleDelete(item.id)}>
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessions Management</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No sessions found.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* CRUD Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Session' : 'Create Session'}</Text>
              
              <Text style={styles.label}>Course</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => {setSelectType('course'); setSelectModalVisible(true);}}>
                <Text style={styles.selectBtnText}>{courses.find(c => c.id === courseId)?.name || 'Select Course'}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Instructor</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => {setSelectType('faculty'); setSelectModalVisible(true);}}>
                <Text style={styles.selectBtnText}>{faculties.find(f => f.id === facultyId)?.name || 'Select Instructor'}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Classroom (Optional)</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => {setSelectType('classroom'); setSelectModalVisible(true);}}>
                <Text style={styles.selectBtnText}>{classrooms.find(c => c.id === classroomId)?.name || 'Select Classroom'}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2024-10-31" placeholderTextColor={Colors.textMuted} />
              
              <View style={styles.switchRow}>
                <Text style={styles.label}>Is Active</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: Colors.border, true: Colors.primary }} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: Colors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Selection Helper Modal */}
      <Modal visible={selectModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <ScrollView>
              {selectType === 'course' && courses.map(c => (
                <TouchableOpacity key={c.id} style={styles.selectListItem} onPress={() => { setCourseId(c.id); setSelectModalVisible(false); }}>
                  <Text style={styles.selectListText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              {selectType === 'faculty' && faculties.map(f => (
                <TouchableOpacity key={f.id} style={styles.selectListItem} onPress={() => { setFacultyId(f.id); setSelectModalVisible(false); }}>
                  <Text style={styles.selectListText}>{f.name}</Text>
                </TouchableOpacity>
              ))}
              {selectType === 'classroom' && (
                <>
                  <TouchableOpacity style={styles.selectListItem} onPress={() => { setClassroomId(''); setSelectModalVisible(false); }}>
                    <Text style={[styles.selectListText, { color: Colors.textMuted }]}>None</Text>
                  </TouchableOpacity>
                  {classrooms.map(c => (
                    <TouchableOpacity key={c.id} style={styles.selectListItem} onPress={() => { setClassroomId(c.id); setSelectModalVisible(false); }}>
                      <Text style={styles.selectListText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.btn, styles.btnCancel, { marginTop: 10 }]} onPress={() => setSelectModalVisible(false)}>
              <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>Close</Text>
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
  
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  courseName: { ...Typography.Typography.h3, color: Colors.textPrimary },
  facultyName: { ...Typography.Typography.body, marginBottom: 12 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { ...Typography.Typography.bodySmall, color: Colors.textMuted },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: Colors.success + '20' },
  statusInactive: { backgroundColor: Colors.textMuted + '20' },
  statusText: { ...Typography.Typography.label, fontSize: 11 },
  
  actionsBox: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionButton: { padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '80%' },
  modalTitle: { ...Typography.Typography.h2, marginBottom: 20, textAlign: 'center' },
  label: { ...Typography.Typography.label, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.textPrimary, marginBottom: 16 },
  
  selectBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 16, marginBottom: 16 },
  selectBtnText: { color: Colors.textPrimary, ...Typography.Typography.body },
  selectListItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectListText: { ...Typography.Typography.body, color: Colors.textPrimary },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminSessionsScreen;
