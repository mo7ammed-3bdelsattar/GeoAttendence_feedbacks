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
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const ROLES = [
  { label: '🎓 Student', value: 'student' },
  { label: '📚 Instructor', value: 'instructor' },
  { label: '🛡️ Admin', value: 'admin' },
];

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation handled by AuthContext listener in AppNavigator
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : err.message ?? 'Login failed.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Glow orbs - moved outside scroll for better interaction */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>📍</Text>
          </View>
          <Text style={styles.appName}>GeoAttend</Text>
          <Text style={styles.tagline}>Smart Attendance, Simplified</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {/* Role Selector */}
          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>I am a</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleChip,
                    role === r.value && styles.roleChipActive,
                  ]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      role === r.value && styles.roleChipTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fields */}
          <InputField
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <InputField
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
            autoComplete="password"
            error={errors.password}
          />

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit */}
          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Geo-Attendance Management System
          </Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
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

  // Decorative glow orbs
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primary,
    opacity: 0.12,
    transform: [{ scale: 1.5 }],
  },
  glowBottom: {
    position: 'absolute',
    bottom: 60,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.accent,
    opacity: 0.08,
    transform: [{ scale: 1.8 }],
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Role selector
  roleSection: {
    marginBottom: Spacing.md,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '22',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  roleChipTextActive: {
    color: Colors.primaryLight,
  },

  // Forgot
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  footerVersion: {
    fontSize: 11,
    color: Colors.textMuted,
    opacity: 0.6,
  },
});

export default LoginScreen;
