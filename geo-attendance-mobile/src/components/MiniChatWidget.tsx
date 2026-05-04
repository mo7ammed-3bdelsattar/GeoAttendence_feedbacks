import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Pressable,
  BackHandler,
} from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

const { width, height } = Dimensions.get('window');

export function MiniChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const toggleChat = () => {
    const toValue = isOpen ? height : 0;
    const toOpacity = isOpen ? 0 : 1;
    
    if (!isOpen) setIsOpen(true);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: toOpacity,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isOpen) setIsOpen(false);
    });
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const onBackPress = () => {
      toggleChat();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    const userMsg: ChatMessage = { id: `${Date.now()}-u`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    try {
      const res = await aiApi.chat({
        message: text,
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = String(res?.message || '').trim() || 'No response.';
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply }]);
    } catch (e: any) {
      const serverMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message;
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: 'assistant', content: serverMessage || 'Failed to send message.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleChat}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>{isOpen ? '✕' : '🤖'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <Animated.View 
          style={[
            styles.container, 
            { 
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim 
            }
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>AI Assistant</Text>
              <Text style={styles.subtitle}>Ask anything about GeoAttend</Text>
            </View>
            <TouchableOpacity onPress={toggleChat} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>How can I help you today, {user?.name?.split(' ')?.[0]}?</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={item.role === 'user' ? styles.rowRight : styles.rowLeft}>
                <View style={item.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                  <Text style={item.role === 'user' ? styles.textUser : styles.textBot}>{item.content}</Text>
                </View>
              </View>
            )}
          />

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type..."
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                multiline
              />
              <TouchableOpacity 
                onPress={send} 
                disabled={sending || input.trim().length === 0} 
                style={[styles.sendBtn, (sending || input.trim().length === 0) && styles.sendBtnDisabled]}
              >
                <Text style={styles.sendText}>{sending ? '...' : '→'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 9999,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
  },
  container: {
    position: 'absolute',
    bottom: 150,
    right: 16,
    width: width * 0.85,
    maxWidth: 350,
    height: 450,
    maxHeight: height * 0.6,
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
    zIndex: 9998,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  title: {
    ...Typography.Typography.h3,
    fontSize: 16,
  },
  subtitle: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bubbleBot: {
    maxWidth: '85%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleUser: {
    maxWidth: '85%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderTopRightRadius: 4,
    padding: 10,
  },
  textBot: {
    ...Typography.Typography.bodySmall,
    color: Colors.textPrimary,
  },
  textUser: {
    ...Typography.Typography.bodySmall,
    color: '#fff',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 80,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
