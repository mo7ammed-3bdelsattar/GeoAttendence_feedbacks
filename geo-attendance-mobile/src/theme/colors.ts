export const Colors = {
  // Primary Palette (aligned with web tailwind primary)
  primary: '#1e3a8a',
  primaryDark: '#172d6b',
  primaryLight: '#3f5ab0',

  // Accent
  accent: '#f59e0b',
  accentLight: '#fbbf24',

  // Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  card: '#ffffff',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',

  // Status
  success: '#10b981',
  error: '#f43f5e',
  warning: '#f59e0b',
  info: '#0ea5e9',

  // Borders
  border: '#e2e8f0',
  borderFocus: '#1e3a8a',

  // Gradients (used as array in LinearGradient)
  gradientPrimary: ['#1e3a8a', '#172d6b'] as const,
  gradientBackground: ['#f8fafc', '#eef2ff'] as const,
  gradientCard: ['#ffffff', '#f8fafc'] as const,

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.55)',
  glass: 'rgba(15,23,42,0.04)',
  glassBorder: 'rgba(15,23,42,0.10)',
};

export default Colors;
