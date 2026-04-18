import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi, feedbackApi } from '../services/api';
import type { Course } from '../types';

const StudentFeedbackScreen: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const data = await studentApi.getStudentCourses(user.id);
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch student courses for feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !selectedCourse || rating === 0) {
      Alert.alert('Error', 'Please select a course and provide a rating.');
      return;
    }
    
    setSubmitting(true);
    try {
      await feedbackApi.submitFeedback({
        studentId: user.id,
        courseId: selectedCourse,
        rating,
        message
      });
      Alert.alert('Success', 'Feedback submitted successfully!');
      setSelectedCourse(null);
      setRating(0);
      setMessage('');
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.error;
      if (status === 409 || (serverMsg && serverMsg.toLowerCase().includes('already'))) {
        Alert.alert(
          'Already Submitted',
          'You have already submitted feedback for this course. Each course only allows one feedback submission.'
        );
      } else {
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, { color: star <= rating ? '#FFD700' : Colors.border }]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (selectedCourse) {
    const courseObj = courses.find((c) => c.id === selectedCourse);
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setSelectedCourse(null)} style={styles.backButton}>
          <Text style={{ color: Colors.primary }}>← Back to Courses</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Rate {courseObj?.name}</Text>
        
        <Text style={styles.label}>Your Rating</Text>
        {renderStars()}
        
        <Text style={styles.label}>Comments (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="How was the course?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course Feedback</Text>
      <Text style={styles.subtitle}>Select a course to rate</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCourses(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No enrolled courses.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.courseCard} onPress={() => setSelectedCourse(item.id)}>
              <Text style={styles.courseName}>{item.name}</Text>
              <Text style={styles.courseCode}>{item.code}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    ...Typography.Typography.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.Typography.body,
    marginBottom: 20,
    color: Colors.textSecondary,
  },
  backButton: {
    marginBottom: 20,
  },
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courseName: {
    ...Typography.Typography.h3,
    marginBottom: 4,
  },
  courseCode: {
    ...Typography.Typography.bodySmall,
    color: Colors.primaryLight,
  },
  label: {
    ...Typography.Typography.label,
    marginTop: 20,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  star: {
    fontSize: 48,
    marginHorizontal: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonText: {
    ...Typography.Typography.h3,
    color: '#fff',
  },
});

export default StudentFeedbackScreen;
