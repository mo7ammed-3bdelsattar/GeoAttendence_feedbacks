import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import Colors from '../theme/colors';
import { Spacing, BorderRadius } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.message ?? 'Failed to send reset email.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Glow */}
        <View style={styles.glow} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{sent ? '✅' : '🔑'}</Text>
        </View>

        {!sent ? (
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you instructions to reset your
              password.
            </Text>

            <InputField
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />

            <PrimaryButton
              title="Send Reset Link"
              onPress={handleReset}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Email Sent!</Text>
            <Text style={styles.subtitle}>
              A password reset link has been sent to{' '}
              <Text style={styles.emailHighlight}>{email}</Text>.{'\n\n'}
              Please check your inbox and follow the instructions.
            </Text>

            <PrimaryButton
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: Spacing.md }}
            />

            <PrimaryButton
              title="Resend Email"
              onPress={handleReset}
              loading={loading}
              variant="ghost"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
  },
  glow: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary,
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  backBtn: {
    marginBottom: Spacing.xl,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emailHighlight: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
