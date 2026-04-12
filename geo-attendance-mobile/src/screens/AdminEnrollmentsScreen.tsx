import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { enrollmentApi, adminApi, User } from '../services/api';
import type { Enrollment, Course } from '../types';

const AdminEnrollmentsScreen: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');

  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [selectType, setSelectType] = useState<'student'|'course' | null>(null);

  const fetchData = async () => {
    try {
      const [enrollData, usersData, coursesData] = await Promise.all([
        enrollmentApi.getEnrollments(),
        adminApi.getUsers('student'),
        adminApi.getCourses()
      ]);
      setEnrollments(enrollData);
      setStudents(usersData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setStudentId('');
    setCourseId('');
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Enrollment', 'Are you sure you want to unenroll this student?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await enrollmentApi.unenrollStudent(id);
          Alert.alert('Success', 'Enrollment removed');
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to remove enrollment');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!studentId || !courseId) {
      Alert.alert('Error', 'Student and Course are required');
      return;
    }
    
    setSubmitting(true);
    try {
      await enrollmentApi.enrollStudent(studentId, courseId);
      Alert.alert('Success', 'Student enrolled successfully');
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Enrollment }) => {
    return (
      <View style={styles.card}>
        <View style={{flex: 1}}>
          <Text style={styles.crName}>{item.student?.name || 'Unknown Student'}</Text>
          <Text style={styles.crDetail}>📚 Course: {item.course?.name || 'Unknown Course'}</Text>
          <Text style={styles.crDetail}>📅 Enrolled: {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={styles.actionsBox}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.error + '20' }]} onPress={() => handleDelete(item.id)}>
            <Text style={{ fontSize: 16 }}>استبعاد</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enrollments</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={enrollments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No enrollments found.</Text>}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enroll Student</Text>
            
            <Text style={styles.label}>Student</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => {setSelectType('student'); setSelectModalVisible(true);}}>
              <Text style={styles.selectBtnText}>{students.find(s => s.id === studentId)?.name || 'Select Student'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Course</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => {setSelectType('course'); setSelectModalVisible(true);}}>
              <Text style={styles.selectBtnText}>{courses.find(c => c.id === courseId)?.name || 'Select Course'}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: Colors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enroll</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Selection Helper Modal */}
      <Modal visible={selectModalVisible} animationType="fade" transparent={true}>
         <View style={styles.modalBg}>
           <View style={[styles.modalContent, { maxHeight: '60%' }]}>
             <Text style={styles.modalTitle}>Select Item</Text>
             <ScrollView>
               {selectType === 'student' && students.map(s => (
                 <TouchableOpacity key={s.id} style={styles.selectListItem} onPress={() => { setStudentId(s.id); setSelectModalVisible(false); }}>
                   <Text style={styles.selectListText}>{s.name} ({s.email})</Text>
                 </TouchableOpacity>
               ))}
               {selectType === 'course' && courses.map(c => (
                 <TouchableOpacity key={c.id} style={styles.selectListItem} onPress={() => { setCourseId(c.id); setSelectModalVisible(false); }}>
                   <Text style={styles.selectListText}>{c.name}</Text>
                 </TouchableOpacity>
               ))}
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
  crName: { ...Typography.Typography.h3, marginBottom: 8 },
  crDetail: { ...Typography.Typography.bodySmall, marginBottom: 4 },
  
  actionsBox: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionButton: { padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '80%' },
  modalTitle: { ...Typography.Typography.h2, marginBottom: 20, textAlign: 'center' },
  label: { ...Typography.Typography.label, marginBottom: 8, marginTop: 4 },
  
  selectBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 16, marginBottom: 16 },
  selectBtnText: { color: Colors.textPrimary, ...Typography.Typography.body },
  selectListItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectListText: { ...Typography.Typography.body, color: Colors.textPrimary },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminEnrollmentsScreen;
