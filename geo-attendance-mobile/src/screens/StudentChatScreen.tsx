import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentChatScreen: React.FC = () => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      if (!user?.id) return;
      const data = await chatApi.getMessages(user.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages');
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user?.id) return;
    
    const msgText = text.trim();
    setText('');
    setLoading(true);

    try {
      await chatApi.sendMessage({
        studentId: user.id,
        senderId: user.id,
        text: msgText,
        isAdmin: false
      });
      loadMessages();
    } catch (error) {
      console.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.messageBubble, !item.isAdmin ? styles.userBubble : styles.adminBubble]}>
      <Text style={[styles.messageText, !item.isAdmin ? styles.userText : styles.adminText]}>
        {item.text}
      </Text>
      <Text style={[styles.timeText, !item.isAdmin ? styles.userTime : styles.adminTime]}>
        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
        <Text style={styles.title}>Contact Admin</Text>
        <Text style={styles.subtitle}>Direct support channel</Text>
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Send a message to start chatting with an admin.</Text>}
      />

      {loading && (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !text.trim() && styles.disabledButton]} 
          onPress={handleSend}
          disabled={!text.trim() || loading}
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
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    fontSize: 12,
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
  adminBubble: {
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
  adminText: {
    color: Colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  adminTime: {
    color: Colors.textSecondary,
    textAlign: 'left',
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
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 100,
    paddingHorizontal: 40,
  },
});

export default StudentChatScreen;
