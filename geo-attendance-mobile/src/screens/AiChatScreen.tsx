import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { chatbotApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

const AiChatScreen: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const DAILY_LIMIT = 5;

  const getStorageKey = () => `chatbot_usage_${user?.id || 'guest'}`;

  useEffect(() => {
    const loadUsage = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const key = getStorageKey();
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const { date, count } = JSON.parse(stored);
          if (date === today) {
            setMessageCount(count);
          } else {
            await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
          }
        } else {
          await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
        }
      } catch(e) {}
    };
    loadUsage();
  }, [user]);

  const title = useMemo(() => 'Absattar AI', []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || messageCount >= DAILY_LIMIT) return;
    setInput('');

    const userMsg: ChatMessage = { id: `${Date.now()}-u`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    try {
      const res = await chatbotApi.ask(text);
      const reply = String(res?.response || '').trim() || 'No response.';
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply }]);
    } catch (e: any) {
      const serverMessage =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message;
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: 'assistant', content: serverMessage || 'Failed to send message.' },
      ]);
    } finally {
      setSending(false);
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      try {
        const today = new Date().toISOString().split('T')[0];
        const key = getStorageKey();
        await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: newCount }));
      } catch(e) {}
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Hi {user?.name?.split(' ')?.[0] || 'there'} — ask me about policies, help, or attendance.</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Hello! I am Absattar, your AI assistant. How can I help you today? You can ask me about attendance policies, university rules, or how to use this app.</Text>
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

      <View style={styles.composerWrapper}>
        {messageCount >= DAILY_LIMIT && (
          <Text style={styles.limitText}>You have reached your daily limit of {DAILY_LIMIT} messages.</Text>
        )}
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={messageCount >= DAILY_LIMIT ? "Daily limit reached" : "Type your message…"}
            placeholderTextColor={Colors.textMuted}
            style={[styles.input, messageCount >= DAILY_LIMIT && styles.disabledInput]}
            editable={messageCount < DAILY_LIMIT}
            multiline
          />
          <TouchableOpacity onPress={send} disabled={sending || input.trim().length === 0 || messageCount >= DAILY_LIMIT} style={[styles.sendBtn, (sending || input.trim().length === 0 || messageCount >= DAILY_LIMIT) && styles.sendBtnDisabled]}>
            <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    ...Typography.Typography.h1,
  },
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  emptyBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.surfaceLight,
  },
  emptyText: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
  },
  rowLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  bubbleBot: {
    maxWidth: '84%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleUser: {
    maxWidth: '84%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textBot: {
    ...Typography.Typography.body,
    color: Colors.textPrimary,
  },
  textUser: {
    ...Typography.Typography.body,
    color: '#fff',
  },
  composerWrapper: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  limitText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 8,
  },
  composer: {
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    backgroundColor: Colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.7,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default AiChatScreen;

