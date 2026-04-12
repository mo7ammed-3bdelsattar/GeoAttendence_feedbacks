import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { adminApi } from '../services/api';

// قائمة الأقسام المتاحة
const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cyber Security',
  'Data Science',
  'Business Administration',
  'Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology'
];

const AdminCoursesScreen: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [courseId, setCourseId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [facultyId, setFacultyId] = useState('');

  // Helper selectors
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [selectType, setSelectType] = useState<'faculty' | 'department' | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('🚀 Fetching courses and faculties...');
      const [coursesData, facultiesData] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getUsers('faculty')
      ]);
      console.log('✅ Courses fetched:', coursesData?.length || 0);
      console.log('✅ Faculties fetched:', facultiesData?.length || 0);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setFaculties(Array.isArray(facultiesData) ? facultiesData : []);
    } catch (error: any) {
      console.error('❌ Failed to fetch data:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    console.log('📝 Opening create modal');
    setIsEditing(false);
    setCourseId('');
    setCode('');
    setName('');
    setDepartment('');
    setFacultyId('');
    setModalVisible(true);
  };

  const openEditModal = (course: any) => {
    console.log('✏️ Opening edit modal for course:', course);
    setIsEditing(true);
    setCourseId(course.id);
    setCode(course.code || '');
    setName(course.name);
    setDepartment(course.department || '');
    setFacultyId(course.facultyId || '');
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Course', 'Are you sure you want to delete this course?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log('🗑️ Deleting course:', id);
          await adminApi.deleteCourse(id);
          console.log('✅ Course deleted successfully');
          Alert.alert('Success', 'Course deleted successfully');
          await fetchData();
        } catch (error: any) {
          console.error('❌ Delete error:', error);
          Alert.alert('Error', error.response?.data?.error || 'Failed to delete course');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    console.log('💾 Save button pressed');
    console.log('Form data:', { code, name, department, facultyId, isEditing });
    
    // التحقق من المدخلات المطلوبة
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter course code');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter course name');
      return;
    }
    if (!department) {
      Alert.alert('Error', 'Please select a department');
      return;
    }
    
    setSubmitting(true);
    try {
      const selectedFaculty = faculties.find(f => f.id === facultyId);
      const payload: any = { 
        name: name.trim(), 
        code: code.trim().toUpperCase(),
        department: department,
        facultyId: facultyId || null,
        facultyName: selectedFaculty?.name || 'Not Assigned'
      };
      
      console.log('📤 Saving course payload:', payload);
      
      let response;
      if (isEditing) {
        console.log('📝 Updating course with ID:', courseId);
        response = await adminApi.updateCourse(courseId, payload);
        console.log('✅ Update response:', response);
        Alert.alert('Success', 'Course updated successfully!');
      } else {
        console.log('➕ Creating new course');
        response = await adminApi.createCourse(payload);
        console.log('✅ Create response:', response);
        Alert.alert('Success', 'Course created successfully!');
      }
      
      // Close modal and reset form
      setModalVisible(false);
      resetForm();
      
      // Refresh the list
      console.log('🔄 Refreshing course list...');
      await fetchData();
      console.log('✅ Course list refreshed');
      
    } catch (error: any) {
      console.error('❌ Save error - Full error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      let errorMessage = 'Failed to save course';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCourseId('');
    setCode('');
    setName('');
    setDepartment('');
    setFacultyId('');
    setIsEditing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const tableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderText, { width: 100 }]}>Code</Text>
      <Text style={[styles.tableHeaderText, { width: 200 }]}>Course Name</Text>
      <Text style={[styles.tableHeaderText, { width: 180 }]}>Department</Text>
      <Text style={[styles.tableHeaderText, { width: 180 }]}>Instructor</Text>
      <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>Actions</Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { width: 100, fontWeight: 'bold', color: Colors.primary }]} numberOfLines={1}>
        {item.code || 'N/A'}
      </Text>
      <Text style={[styles.tableCell, { width: 200 }]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.tableCell, { width: 180, color: Colors.textSecondary }]} numberOfLines={2}>
        🏛️ {item.department || 'Not specified'}
      </Text>
      <Text style={[styles.tableCell, { width: 180, color: Colors.textSecondary }]} numberOfLines={2}>
        👨‍🏫 {item.facultyName || 'Not Assigned'}
      </Text>
      <View style={[styles.actionsBox, { width: 100, justifyContent: 'center' }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.error + '20' }]} onPress={() => handleDelete(item.id)}>
          <Text style={{ fontSize: 16 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Courses Management</Text>
        <Text style={styles.subtitle}>Manage your courses, departments, and instructors</Text>
        <Text style={styles.stats}>Total Courses: {courses.length}</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ minWidth: 760 }}>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id || item._id || Math.random().toString()}
              renderItem={renderItem}
              ListHeaderComponent={tableHeader}
              contentContainerStyle={{ paddingBottom: 100 }}
              stickyHeaderIndices={[0]}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={Colors.primary} 
                />
              }
              ListEmptyComponent={
                <Text style={{ color: Colors.textSecondary, textAlign: 'center', padding: 20 }}>
                  No courses found. Tap the + button to add a course.
                </Text>
              }
            />
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* CRUD Modal */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {isEditing ? '✏️ Edit Course' : '➕ Create New Course'}
              </Text>
              
              {/* Course Code */}
              <Text style={styles.label}>Course Code *</Text>
              <TextInput 
                style={styles.input} 
                value={code} 
                onChangeText={setCode} 
                placeholder="e.g., CS101, SE201, IT301" 
                placeholderTextColor={Colors.textMuted} 
                autoCapitalize="characters"
                autoCorrect={false}
              />

              {/* Course Name */}
              <Text style={styles.label}>Course Name *</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="e.g., Introduction to Programming" 
                placeholderTextColor={Colors.textMuted} 
              />
              
              {/* Department */}
              <Text style={styles.label}>Department *</Text>
              <TouchableOpacity 
                style={styles.selectBtn} 
                onPress={() => { setSelectType('department'); setSelectModalVisible(true); }}
              >
                <Text style={[styles.selectBtnText, !department && { color: Colors.textMuted }]}>
                  {department || 'Select Department'}
                </Text>
              </TouchableOpacity>

              {/* Instructor */}
              <Text style={styles.label}>Instructor (Optional)</Text>
              <TouchableOpacity 
                style={styles.selectBtn} 
                onPress={() => { setSelectType('faculty'); setSelectModalVisible(true); }}
              >
                <Text style={[styles.selectBtnText, !facultyId && { color: Colors.textMuted }]}>
                  {faculties.find(f => f.id === facultyId)?.name || 'Select Instructor (Optional)'}
                </Text>
              </TouchableOpacity>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnCancel]} 
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={{ color: Colors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnSave]} 
                  onPress={handleSave} 
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Course</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Selection Modal */}
      {selectModalVisible && (
        <Modal visible={selectModalVisible} animationType="fade" transparent={true}>
          <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setSelectModalVisible(false)}>
            <TouchableOpacity style={[styles.modalContent, { maxHeight: '70%' }]} activeOpacity={1}>
              <Text style={styles.modalTitle}>
                Select {selectType === 'faculty' ? 'Instructor' : 'Department'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Department Selection */}
                {selectType === 'department' && (
                  <>
                    {DEPARTMENTS.map(dept => (
                      <TouchableOpacity 
                        key={dept} 
                        style={styles.selectListItem} 
                        onPress={() => { 
                          setDepartment(dept); 
                          setSelectModalVisible(false); 
                        }}
                      >
                        <Text style={[styles.selectListText, department === dept && { color: Colors.primary, fontWeight: 'bold' }]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Faculty Selection */}
                {selectType === 'faculty' && (
                  <>
                    <TouchableOpacity 
                      style={styles.selectListItem} 
                      onPress={() => { 
                        setFacultyId(''); 
                        setSelectModalVisible(false); 
                      }}
                    >
                      <Text style={[styles.selectListText, !facultyId && { color: Colors.primary, fontWeight: 'bold' }]}>
                        -- No Instructor --
                      </Text>
                    </TouchableOpacity>
                    {faculties.length === 0 && (
                      <Text style={{ textAlign: 'center', margin: 20, color: Colors.textMuted }}>
                        No instructors found. Create faculty users first.
                      </Text>
                    )}
                    {faculties.map(f => (
                      <TouchableOpacity 
                        key={f.id} 
                        style={styles.selectListItem} 
                        onPress={() => { 
                          setFacultyId(f.id); 
                          setSelectModalVisible(false); 
                        }}
                      >
                        <Text style={[styles.selectListText, facultyId === f.id && { color: Colors.primary, fontWeight: 'bold' }]}>
                          {f.name} ({f.email})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
              <TouchableOpacity 
                style={[styles.btn, styles.btnCancel, { marginTop: 10 }]} 
                onPress={() => setSelectModalVisible(false)}
              >
                <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  title: { ...Typography.Typography.h1, marginBottom: 5 },
  subtitle: { ...Typography.Typography.body, color: Colors.textSecondary, marginBottom: 5 },
  stats: { ...Typography.Typography.label, color: Colors.primary, marginBottom: 15, fontWeight: 'bold' },
  
  // Table Layout Styles
  tableHeaderRow: { 
    flexDirection: 'row', 
    backgroundColor: Colors.surface, 
    paddingVertical: 12, 
    paddingHorizontal: 8, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12, 
    borderBottomWidth: 2, 
    borderBottomColor: Colors.border 
  },
  tableHeaderText: { ...Typography.Typography.label, color: Colors.textSecondary, paddingRight: 10, fontWeight: 'bold' },
  tableRow: { 
    flexDirection: 'row', 
    backgroundColor: Colors.card, 
    paddingVertical: 14, 
    paddingHorizontal: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border, 
    alignItems: 'center' 
  },
  tableCell: { ...Typography.Typography.body, color: Colors.textPrimary, paddingRight: 10 },

  actionsBox: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 30, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 5 
  },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { 
    backgroundColor: Colors.surface, 
    borderRadius: 16, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    maxHeight: '80%', 
    overflow: 'hidden' 
  },
  modalTitle: { ...Typography.Typography.h2, marginBottom: 20, textAlign: 'center' },
  label: { ...Typography.Typography.label, marginBottom: 8, marginTop: 4, fontWeight: 'bold' },
  input: { 
    backgroundColor: Colors.background, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    borderRadius: 8, 
    padding: 12, 
    color: Colors.textPrimary, 
    marginBottom: 16,
    fontSize: 14
  },
  
  selectBtn: { 
    backgroundColor: Colors.background, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16 
  },
  selectBtnText: { color: Colors.textPrimary, ...Typography.Typography.body },
  selectListItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card
  },
  selectListText: { ...Typography.Typography.body, color: Colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminCoursesScreen;