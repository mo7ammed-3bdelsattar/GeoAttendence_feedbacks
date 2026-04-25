import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

const AiChatScreen: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const title = useMemo(() => 'AI Assistant', []);

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
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Hi {user?.name?.split(' ')?.[0] || 'there'} — ask about QR & location attendance.</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Try: “QR مش بيظهر ليه؟” أو “أعمل check-in بالـ location ازاي؟”</Text>
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

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your message…"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          multiline
        />
        <TouchableOpacity onPress={send} disabled={sending || input.trim().length === 0} style={[styles.sendBtn, (sending || input.trim().length === 0) && styles.sendBtnDisabled]}>
          <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
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
  composer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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

