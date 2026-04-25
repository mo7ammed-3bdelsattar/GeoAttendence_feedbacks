import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import { navigate } from '../navigation/navigationRef';

export function FloatingAiButton() {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigate('AiChat')}
      style={styles.fab}
    >
      <Text style={styles.text}>🤖</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 86,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: {
    fontSize: 22,
    color: '#fff',
  },
});

