import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Colors from '../theme/colors';
import { RootStackParamList, AdminTabParamList, InstructorTabParamList, StudentTabParamList } from './types';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Placeholders for the screens we need to create
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminCoursesScreen from '../screens/AdminCoursesScreen';
import AdminSessionsScreen from '../screens/AdminSessionsScreen';
import AdminDepartmentsScreen from '../screens/AdminDepartmentsScreen';
import AdminClassroomsScreen from '../screens/AdminClassroomsScreen';
import AdminEnrollmentsScreen from '../screens/AdminEnrollmentsScreen';
import AdminFeedbackAuditScreen from '../screens/AdminFeedbackAuditScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';

import InstructorDashboardScreen from '../screens/InstructorDashboardScreen';
import InstructorSessionsScreen from '../screens/InstructorSessionsScreen';
import InstructorFeedbackScreen from '../screens/InstructorFeedbackScreen';
import InstructorReportsScreen from '../screens/InstructorReportsScreen';

import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import StudentSessionsScreen from '../screens/StudentSessionsScreen';
import StudentFeedbackScreen from '../screens/StudentFeedbackScreen';
import StudentChatbotScreen from '../screens/StudentChatbotScreen';
import StudentChatScreen from '../screens/StudentChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const InstructorTab = createBottomTabNavigator<InstructorTabParamList>();
const StudentTab = createBottomTabNavigator<StudentTabParamList>();

const commonTabOptions = {
  headerShown: false,
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.textSecondary,
  tabBarStyle: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.glassBorder,
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

const AdminTabs = () => (
  <AdminTab.Navigator screenOptions={commonTabOptions}>
    <AdminTab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
    <AdminTab.Screen name="Users" component={AdminUsersScreen} options={{ tabBarIcon: () => <Text>👥</Text> }} />
    <AdminTab.Screen name="Courses" component={AdminCoursesScreen} options={{ tabBarIcon: () => <Text>📚</Text> }} />
    <AdminTab.Screen name="Sessions" component={AdminSessionsScreen} options={{ tabBarIcon: () => <Text>🗓️</Text> }} />
    <AdminTab.Screen name="Departments" component={AdminDepartmentsScreen} options={{ tabBarButton: () => null }} />
    <AdminTab.Screen name="Classrooms" component={AdminClassroomsScreen} options={{ tabBarButton: () => null }} />
    <AdminTab.Screen name="Enrollments" component={AdminEnrollmentsScreen} options={{ tabBarButton: () => null }} />
    <AdminTab.Screen name="FeedbackAudit" component={AdminFeedbackAuditScreen} options={{ tabBarButton: () => null }} />
    <AdminTab.Screen name="AdminReports" component={AdminReportsScreen} options={{ tabBarButton: () => null }} />
  </AdminTab.Navigator>
);

const InstructorTabs = () => (
  <InstructorTab.Navigator screenOptions={commonTabOptions}>
    <InstructorTab.Screen name="Dashboard" component={InstructorDashboardScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
    <InstructorTab.Screen name="Sessions" component={InstructorSessionsScreen} options={{ tabBarIcon: () => <Text>🗓️</Text> }} />
    <InstructorTab.Screen name="Feedback" component={InstructorFeedbackScreen} options={{ tabBarIcon: () => <Text>💬</Text> }} />
    <InstructorTab.Screen name="Analytics" component={InstructorReportsScreen} options={{ tabBarIcon: () => <Text>📈</Text> }} />
  </InstructorTab.Navigator>
);

const StudentTabs = () => (
  <StudentTab.Navigator screenOptions={commonTabOptions}>
    <StudentTab.Screen name="Dashboard" component={StudentDashboardScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
    <StudentTab.Screen name="Sessions" component={StudentSessionsScreen} options={{ tabBarIcon: () => <Text>📍</Text> }} />
    <StudentTab.Screen name="Feedback" component={StudentFeedbackScreen} options={{ tabBarIcon: () => <Text>💬</Text> }} />
    <StudentTab.Screen name="Chatbot" component={StudentChatbotScreen} options={{ tabBarIcon: () => <Text>🤖</Text> }} />
    <StudentTab.Screen name="Chat" component={StudentChatScreen} options={{ tabBarIcon: () => <Text>🆘</Text> }} />
  </StudentTab.Navigator>
);

const SplashScreen: React.FC = () => (
  <View style={splash.container}>
    <Text style={splash.emoji}>📍</Text>
    <Text style={splash.title}>GeoAttend</Text>
    <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 32 }} />
  </View>
);

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  usePushNotifications(user);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        {user ? (
          user.role === 'admin' ? (
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
          ) : user.role === 'instructor' ? (
            <Stack.Screen name="InstructorTabs" component={InstructorTabs} />
          ) : (
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 60, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
});

export default AppNavigator;
