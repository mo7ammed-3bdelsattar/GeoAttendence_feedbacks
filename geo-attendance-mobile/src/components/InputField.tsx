import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import Colors from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/typography';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  isPassword,
  leftIcon,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithIcon : null]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  leftIcon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.md,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: 2,
  },
});

export default InputField;
