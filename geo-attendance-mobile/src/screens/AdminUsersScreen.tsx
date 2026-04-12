import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { adminApi, User } from '../services/api';

const AdminUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');

  const fetchUsers = async () => {
    try {
      console.log('🚀 Fetching users...');
      const data = await adminApi.getUsers();
      console.log('✅ Users fetched successfully:', data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('❌ Failed to fetch users:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to fetch users: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    console.log('📝 Opening create modal');
    setIsEditing(false);
    setUserId('');
    setName('');
    setEmail('');
    setPassword('');
    setRole('student');
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    console.log('✏️ Opening edit modal for user:', user);
    setIsEditing(true);
    setUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); 
    setRole(user.role);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log('🗑️ Deleting user:', id);
          await adminApi.deleteUser(id);
          console.log('✅ User deleted successfully');
          Alert.alert('Success', 'User deleted');
          await fetchUsers();
        } catch (error: any) {
          console.error('❌ Delete error:', error);
          Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    console.log('💾 Save button pressed');
    console.log('Form data:', { name, email, password: password ? '***' : 'empty', role, isEditing });
    
    // التحقق من المدخلات
    if (!name.trim()) {
      console.log('❌ Validation failed: Name is empty');
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    
    if (!email.trim()) {
      console.log('❌ Validation failed: Email is empty');
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    
    if (!isEditing && !password.trim()) {
      console.log('❌ Validation failed: Password is empty for new user');
      Alert.alert('Error', 'Please enter a password for new user');
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (isEditing) {
        console.log('📝 Updating user with ID:', userId);
        const updateData: any = { 
          name: name.trim(), 
          email: email.trim(), 
          role
        };
        
        if (password.trim()) {
          updateData.password = password.trim();
          console.log('🔑 Password will be updated');
        } else {
          console.log('🔑 Password unchanged');
        }
        
        console.log('Sending update data:', { ...updateData, password: updateData.password ? '***' : undefined });
        const response = await adminApi.updateUser(userId, updateData);
        console.log('✅ Update response:', response);
        Alert.alert('Success', 'User updated successfully');
      } else {
        console.log('➕ Creating new user');
        const newUser = { 
          name: name.trim(), 
          email: email.trim(), 
          role, 
          password: password.trim() 
        };
        console.log('Sending create data:', { ...newUser, password: '***' });
        const response = await adminApi.createUser(newUser);
        console.log('✅ Create response:', response);
        Alert.alert('Success', 'User created successfully');
      }
      
      // إغلاق المودال وتحديث القائمة
      setModalVisible(false);
      
      // تنظيف الفورم
      setName('');
      setEmail('');
      setPassword('');
      setRole('student');
      
      // تحديث القائمة
      console.log('🔄 Refreshing user list...');
      await fetchUsers();
      console.log('✅ User list refreshed');
      
    } catch (error: any) {
      console.error('❌ Save error - Full error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error data:', error.response?.data);
      
      let errorMessage = 'Failed to save user';
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

  // باقي الكود كما هو...
  const tableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderText, { width: 140 }]}>Name</Text>
      <Text style={[styles.tableHeaderText, { width: 180 }]}>Email</Text>
      <Text style={[styles.tableHeaderText, { width: 90 }]}>Role</Text>
      <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>Actions</Text>
    </View>
  );

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={2}>{item.email}</Text>
      <View style={{ width: 90, justifyContent: 'center', alignItems: 'flex-start' }}>
        <View style={[styles.roleBadge, 
          item.role === 'admin' ? styles.roleAdmin : 
          item.role === 'faculty' ? styles.roleFaculty : styles.roleStudent]}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Manage Users</Text>
        <Text style={styles.userCount}>Total: {users.length} users</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ minWidth: 540 }}>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id || item._id || Math.random().toString()}
              renderItem={renderItem}
              ListHeaderComponent={tableHeader}
              contentContainerStyle={{ paddingBottom: 100 }} 
              stickyHeaderIndices={[0]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={Colors.primary} />}
              ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center', padding: 20 }}>No users found. Tap + to add.</Text>}
            />
          </View>
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{isEditing ? 'Edit User' : 'Add New User'}</Text>
              
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full Name" placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Password {isEditing ? '(Optional, fill to change)' : '*'}</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor={Colors.textMuted} />
              
              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleContainer}>
                {['student', 'faculty', 'admin'].map(r => (
                  <TouchableOpacity key={r} style={[styles.roleSelectBtn, role === r && styles.roleSelectBtnActive]} onPress={() => setRole(r as any)}>
                    <Text style={[styles.roleSelectText, role === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { ...Typography.Typography.h1 },
  userCount: { ...Typography.Typography.body, color: Colors.textSecondary },
  
  tableHeaderRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 2, borderBottomColor: Colors.border },
  tableHeaderText: { ...Typography.Typography.label, color: Colors.textSecondary, paddingRight: 10 },
  tableRow: { flexDirection: 'row', backgroundColor: Colors.card, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  tableCell: { ...Typography.Typography.body, color: Colors.textPrimary, paddingRight: 10 },
  
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  roleStudent: { backgroundColor: Colors.info + '20' },
  roleFaculty: { backgroundColor: Colors.warning + '20' },
  roleAdmin: { backgroundColor: Colors.error + '20' },
  roleText: { ...Typography.Typography.label, color: Colors.textSecondary, fontSize: 11 },
  
  actionsBox: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
  
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  fabIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '80%' },
  modalTitle: { ...Typography.Typography.h2, marginBottom: 20, textAlign: 'center' },
  label: { ...Typography.Typography.label, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.textPrimary, marginBottom: 16 },
  
  roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  roleSelectBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  roleSelectBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleSelectText: { ...Typography.Typography.label, color: Colors.textSecondary },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceLight },
  btnSave: { backgroundColor: Colors.primary },
});

export default AdminUsersScreen;