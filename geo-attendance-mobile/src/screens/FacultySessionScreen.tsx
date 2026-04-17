import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRoleGuard } from '../hooks/useRoleGuard';
import RoleMismatchModal from '../components/RoleMismatchModal';
import PrimaryButton from '../components/PrimaryButton';
import Colors from '../theme/colors';
import { Spacing } from '../theme/typography';

const FacultySessionScreen: React.FC = () => {
  const { user } = useAuth();
  const { mismatch, currentRole } = useRoleGuard('faculty');
  const [loading, setLoading] = useState(false);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      // Call API
      Alert.alert('Success', 'Session started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert('End Session', 'هتخلص المحاضرة؟ مش هيقدر حد يسجل بعد كده.', [
      { text: 'Cancel' },
      { text: 'End', onPress: async () => {
        setLoading(true);
        try {
          // Call API
          Alert.alert('Success', 'Session ended');
        } catch (error) {
          Alert.alert('Error', 'Failed to end session');
        } finally {
          setLoading(false);
        }
      }},
    ]);
  };

  if (mismatch) {
    return (
      <RoleMismatchModal
        visible={true}
        currentRole={currentRole}
        requiredRole="faculty"
        onNavigateToLogin={() => {}}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>إدارة المحاضرة</Text>

      <PrimaryButton
        title="ابدأ المحاضرة"
        onPress={handleStartSession}
        loading={loading}
        style={{ backgroundColor: '#28a745', marginBottom: Spacing.medium }}
      />

      <PrimaryButton
        title="خلّص المحاضرة"
        onPress={handleEndSession}
        loading={loading}
        style={{ backgroundColor: '#dc3545' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.medium,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.large,
  },
});

export default FacultySessionScreen;