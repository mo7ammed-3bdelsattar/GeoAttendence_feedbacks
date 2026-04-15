export const Colors = {
  // Primary Palette
  primary: '#6C63FF',
  primaryDark: '#4A42D6',
  primaryLight: '#9B95FF',

  // Accent
  accent: '#FF6584',
  accentLight: '#FF8FA3',

  // Backgrounds
  background: '#0F0E1A',
  surface: '#1A1928',
  surfaceLight: '#252340',
  card: '#1E1D30',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#5A5A7A',

  // Status
  success: '#4CAF82',
  error: '#FF5252',
  warning: '#FFB74D',
  info: '#64B5F6',

  // Borders
  border: '#2E2C4A',
  borderFocus: '#6C63FF',

  // Gradients (used as array in LinearGradient)
  gradientPrimary: ['#6C63FF', '#4A42D6'] as const,
  gradientBackground: ['#0F0E1A', '#1A1928'] as const,
  gradientCard: ['#1A1928', '#252340'] as const,

  // Overlays
  overlay: 'rgba(15, 14, 26, 0.7)',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

export default Colors;
