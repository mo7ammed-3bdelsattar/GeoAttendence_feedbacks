import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../theme/colors';
import { Spacing, BorderRadius } from '../theme/typography';
import PrimaryButton from '../components/PrimaryButton';

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.accent,
  instructor: Colors.info,
  student: Colors.success,
};

const ROLE_ICONS: Record<string, string> = {
  admin: '🛡️',
  instructor: '📚',
  student: '🎓',
};

const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const doLogout = async () => {
    try {
      await logout();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert doesn't work on web — use window.confirm instead
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) doLogout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const roleColor = ROLE_COLORS[user?.role ?? 'student'];
  const roleIcon = ROLE_ICONS[user?.role ?? 'student'];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header glow */}
      <View style={[styles.glowHeader, { backgroundColor: roleColor }]} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.greeting}>Hello, 👋</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={[styles.avatarRing, { borderColor: roleColor + '55' }]}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '22' }]}>
            <Text style={styles.avatarIcon}>{roleIcon}</Text>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={[styles.roleText, { color: roleColor }]}>
              {(user?.role ?? 'student').charAt(0).toUpperCase() +
                (user?.role ?? 'student').slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Cards */}
      <Text style={styles.sectionTitle}>Your Account</Text>

      <View style={styles.infoGrid}>
        <InfoCard icon="📧" label="Email" value={user?.email ?? '—'} />
        <InfoCard
          icon="🏷️"
          label="Role"
          value={
            (user?.role ?? 'student').charAt(0).toUpperCase() +
            (user?.role ?? 'student').slice(1)
          }
        />
        <InfoCard icon="🔐" label="UID" value={user?.uid.slice(0, 12) + '…'} />
        <InfoCard icon="✅" label="Status" value="Active" highlight />
      </View>

      {/* Coming soon section */}
      <Text style={styles.sectionTitle}>Coming Soon</Text>
      <View style={styles.comingSoonCard}>
        <Text style={styles.comingSoonIcon}>🗺️</Text>
        <Text style={styles.comingSoonTitle}>Geo-Fenced Attendance</Text>
        <Text style={styles.comingSoonText}>
          Check in & out from class sessions using your live GPS location.
        </Text>
      </View>

      {/* Sign out button */}
      <PrimaryButton
        title="Sign Out"
        onPress={handleLogout}
        variant="secondary"
        style={{ marginTop: Spacing.lg }}
      />
    </ScrollView>
  );
};

const InfoCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <View style={infoStyles.card}>
    <Text style={infoStyles.icon}>{icon}</Text>
    <Text style={infoStyles.label}>{label}</Text>
    <Text
      style={[infoStyles.value, highlight && { color: Colors.success }]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const infoStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
  },
  icon: {
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
  },
  glowHeader: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.1,
    transform: [{ scale: 1.6 }],
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Profile card
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  comingSoonCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  comingSoonIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  comingSoonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HomeScreen;
