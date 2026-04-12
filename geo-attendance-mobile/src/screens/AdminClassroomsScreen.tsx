import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { adminApi } from '../services/api';
import type { Classroom } from '../types';

const AdminClassroomsScreen: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [classroomId, setClassroomId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('30');

  const fetchClassrooms = async () => {
    try {
      const data = await adminApi.getClassrooms();
      setClassrooms(data);
    } catch (error) {
      console.error('Failed to fetch classrooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setClassroomId('');
    setName('');
    setLocation('');
    setCapacity('30');
    setModalVisible(true);
  };

  const openEditModal = (classroom: Classroom) => {
    setIsEditing(true);
    setClassroomId(classroom.id);
    setName(classroom.name);
    setLocation(classroom.location || '');
    setCapacity(classroom.capacity?.toString() || '30');
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Classroom', 'Are you sure you want to delete this classroom?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminApi.deleteClassroom(id);
          Alert.alert('Success', 'Classroom deleted');
          fetchClassrooms();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete classroom');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Classroom name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = { name, location, capacity: parseInt(capacity) || 30 };
      if (isEditing) {
        await adminApi.updateClassroom(classroomId, payload);
        Alert.alert('Success', 'Classroom updated');
      } else {
        await adminApi.createClassroom(payload);
        Alert.alert('Success', 'Classroom created');
      }
      setModalVisible(false);
      fetchClassrooms();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save classroom');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Classroom }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.crName}>{item.name}</Text>
        <Text style={styles.crDetail}>📍 {item.location || 'No Location'}</Text>
        <Text style={styles.crDetail}>👥 Capacity: {item.capacity || 0}</Text>
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
      <Text style={styles.title}>Classrooms</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClassrooms(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No classrooms found.</Text>}
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
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Classroom' : 'Create Classroom'}</Text>
              
              <Text style={styles.label}>Name / Code</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Building A - 101" placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Location / Link (Optional)</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Physical or Virtual link" placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Capacity</Text>
              <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="e.g. 50" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
              
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
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.textPrimary, marginBottom: 16 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminClassroomsScreen;
