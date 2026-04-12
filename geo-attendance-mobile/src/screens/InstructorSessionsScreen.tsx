import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';

const InstructorSessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const allCourses = await adminApi.getCourses();
      const myCourses = allCourses.filter(c => c.facultyId === user.id);
      setCourses(myCourses);
    } catch (error) {
      console.error('Failed to fetch instructor courses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseCode}>{item.code || 'N/A'}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Assigned</Text>
          </View>
        </View>
        <Text style={styles.courseName}>{item.name}</Text>
        <Text style={styles.detailText}>📅 {item.day || 'N/A'}</Text>
        <Text style={styles.detailText}>⏰ {item.startTime || '--'} to {item.endTime || '--'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Classes / Courses</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCourses(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={<Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No courses assigned to you yet.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  title: { ...Typography.Typography.h1, marginBottom: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCode: { ...Typography.Typography.label, color: Colors.primaryLight },
  courseName: { ...Typography.Typography.h3, color: Colors.textPrimary, marginBottom: 12 },
  detailText: { ...Typography.Typography.body, color: Colors.textMuted, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.success + '20' },
  statusText: { ...Typography.Typography.label, fontSize: 11, color: Colors.success },
});

export default InstructorSessionsScreen;
