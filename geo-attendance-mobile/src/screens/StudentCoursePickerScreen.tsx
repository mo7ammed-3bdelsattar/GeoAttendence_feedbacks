import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { studentApi } from '../services/api';
import type { Course } from '../types';

const StudentCoursePickerScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [courses, myCourses] = await Promise.all([
          studentApi.getAllCourses().catch(() => []),
          studentApi.getStudentCourses(user.id).catch(() => []),
        ]);
        setAllCourses(courses || []);
        const initial: Record<string, boolean> = {};
        for (const c of (myCourses || []) as Course[]) initial[c.id] = true;
        setSelected(initial);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const save = async () => {
    if (!user) return;
    if (selectedIds.length === 0) {
      Alert.alert('Select courses', 'Please select at least one course.');
      return;
    }
    setSaving(true);
    try {
      await studentApi.saveCourses(user.id, selectedIds);
      Alert.alert('Saved', 'Your courses were saved successfully.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message;
      Alert.alert('Save failed', msg || 'Failed to save your courses.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Courses</Text>
      <Text style={styles.subtitle}>Select your courses, then tap Save.</Text>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={allCourses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No courses found.</Text>}
          renderItem={({ item }) => {
            const checked = !!selected[item.id];
            return (
              <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.8}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  <Text style={styles.checkboxText}>{checked ? '✓' : ''}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.courseCode}>{item.code}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving || loading}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : `Save (${selectedIds.length})`}</Text>
      </TouchableOpacity>
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
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyText: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    color: '#fff',
    fontWeight: '800',
  },
  courseName: {
    ...Typography.Typography.h3,
    color: Colors.textPrimary,
  },
  courseCode: {
    ...Typography.Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default StudentCoursePickerScreen;

