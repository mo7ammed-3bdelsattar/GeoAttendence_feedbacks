import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

const ProfileScreen: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await userApi.getMe();
      setProfileData(data);
      setName(data.name || '');
      setPhotoURL(data.photoURL || '');
      // Sync context just in case
      await updateProfile({ name: data.name, photoURL: data.photoURL });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      
      // 1. Show local preview immediately (This is what "worked before")
      setPhotoURL(selectedUri);
      
      // 2. Try to sync with server
      setIsUploading(true);
      try {
        const { url } = await userApi.uploadAvatar(selectedUri);
        // 3. Update with permanent server URL
        setPhotoURL(url);
        // Also update backend user profile immediately
        await userApi.updateMe({ photoURL: url });
        await updateProfile({ photoURL: url });
        Alert.alert('Success', 'Profile image saved to server.');
      } catch (error: any) {
        console.warn('[UPLOAD] Server upload failed, keeping local preview.', error.message);
        // Don't alert here to avoid annoying the user if they have a local preview working
        // but we'll show a small warning in logs.
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await userApi.updateMe({ name, photoURL });
      Alert.alert('Success', 'Profile updated successfully.');
      
      // Update global context
      await updateProfile({
        name: updatedUser.name,
        photoURL: updatedUser.photoURL
      });
      
      // Update local state
      setProfileData(updatedUser);
      setName(updatedUser.name || '');
      setPhotoURL(updatedUser.photoURL || '');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imageSection}>
          <TouchableOpacity onPress={handlePickImage} disabled={isUploading}>
            {photoURL ? (
              <View>
                <Image source={{ uri: photoURL }} style={styles.profileImage} />
                {isUploading && (
                  <View style={[styles.profileImage, styles.uploadingOverlay]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {(name || '').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                </Text>
                {isUploading && (
                  <View style={[styles.profileImage, styles.uploadingOverlay, { position: 'absolute' }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
            )}
            {!isUploading && (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profileData?.email}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profileData?.role?.toUpperCase()}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.updateBtn, updating && styles.disabledBtn]}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    ...Typography.Typography.h1,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.error + '10',
  },
  logoutText: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...Typography.Typography.label,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: Colors.surface,
    color: Colors.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  updateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileScreen;
