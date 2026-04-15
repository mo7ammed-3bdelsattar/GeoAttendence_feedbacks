import { StyleSheet } from 'react-native';
import Colors from './colors';

export const Typography = StyleSheet.create({
  display: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export default { Typography, Spacing, BorderRadius };
