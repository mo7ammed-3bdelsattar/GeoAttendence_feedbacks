import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { adminApi } from '../services/api';
import type { Department } from '../types';

const AdminDepartmentsScreen: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [deptId, setDeptId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchDepartments = async () => {
    try {
      const data = await adminApi.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setDeptId('');
    setName('');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (dept: Department) => {
    setIsEditing(true);
    setDeptId(dept.id);
    setName(dept.name);
    setDescription(dept.description || '');
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Department', 'Are you sure you want to delete this department?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminApi.deleteDepartment(id);
          Alert.alert('Success', 'Department deleted');
          fetchDepartments();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete department');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      if (isEditing) {
        await adminApi.updateDepartment(deptId, { name, description });
        Alert.alert('Success', 'Department updated');
      } else {
        await adminApi.createDepartment({ name, description });
        Alert.alert('Success', 'Department created');
      }
      setModalVisible(false);
      fetchDepartments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Department }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.deptName}>{item.name}</Text>
        {item.description ? <Text style={styles.deptDesc} numberOfLines={2}>{item.description}</Text> : null}
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Departments</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDepartments(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No departments found.</Text>}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* CRUD Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Department' : 'Create Department'}</Text>
              
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Computer Science" placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="About this department..." placeholderTextColor={Colors.textMuted} multiline />
              
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  title: { ...Typography.Typography.h1, marginBottom: 20 },
  
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  deptName: { ...Typography.Typography.h3, marginBottom: 4 },
  deptDesc: { ...Typography.Typography.bodySmall },
  
  actionsBox: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionButton: { padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '80%' },
  modalTitle: { ...Typography.Typography.h2, marginBottom: 20, textAlign: 'center' },
  label: { ...Typography.Typography.label, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.textPrimary, marginBottom: 16 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminDepartmentsScreen;
