import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { chatbotApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const StudentChatbotScreen: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot', text: string }[]>([
    { sender: 'bot', text: 'Hello! I am Absattar, your AI assistant. How can I help you today? You can ask me about attendance policies, university rules, or how to use this app.' }
  ]);
  const [loading, setLoading] = useState(false);
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

  const handleSend = async () => {
    if (!query.trim() || messageCount >= DAILY_LIMIT) return;
    
    const userMsg = query.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const data = await chatbotApi.ask(userMsg);
      setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      try {
        const today = new Date().toISOString().split('T')[0];
        const key = getStorageKey();
        await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: newCount }));
      } catch(e) {}
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Policy Chatbot</Text>
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messageList}
        inverted={false}
      />

      {loading && (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
      )}

      <View style={styles.inputContainer}>
        {messageCount >= DAILY_LIMIT && (
          <Text style={styles.limitText}>You have reached your daily limit of {DAILY_LIMIT} messages.</Text>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, messageCount >= DAILY_LIMIT && styles.disabledInput]}
            value={query}
            onChangeText={setQuery}
            placeholder={messageCount >= DAILY_LIMIT ? "Daily limit reached" : "Ask me something..."}
            placeholderTextColor={Colors.textSecondary}
            editable={messageCount < DAILY_LIMIT}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!query.trim() || messageCount >= DAILY_LIMIT) && styles.disabledButton]} 
            onPress={handleSend}
            disabled={!query.trim() || loading || messageCount >= DAILY_LIMIT}
          >
            <Text style={styles.sendButtonText}>Send</Text>
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
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    ...Typography.Typography.h1,
  },
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    ...Typography.Typography.body,
    fontSize: 14,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: Colors.textPrimary,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  limitText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: Colors.textPrimary,
    marginRight: 10,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.7,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StudentChatbotScreen;
