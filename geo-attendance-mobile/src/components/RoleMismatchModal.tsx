import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface Props {
  visible: boolean;
  currentRole: string;
  requiredRole: string;
  onConfirm: () => void;
}

const RoleMismatchModal: React.FC<Props> = ({ visible, currentRole, requiredRole, onConfirm }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>أنت مسجل كـ {currentRole}</Text>
          <Text style={styles.message}>الشاشة دي مخصصة لـ {requiredRole} بس.</Text>
          <TouchableOpacity style={styles.button} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.buttonText}>اختر دورك الصح</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});

export default RoleMismatchModal;
