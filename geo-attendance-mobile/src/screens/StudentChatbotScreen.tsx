import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { chatbotApi } from '../services/api';

const StudentChatbotScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot', text: string }[]>([
    { sender: 'bot', text: 'Hello! I am your University Assistant. Ask me anything about college policies.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    
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
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Ask me something..."
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !query.trim() && styles.disabledButton]} 
          onPress={handleSend}
          disabled={!query.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
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
