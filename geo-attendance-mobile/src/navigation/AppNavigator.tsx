import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Colors from '../theme/colors';
import { RootStackParamList, AdminTabParamList, InstructorTabParamList, StudentTabParamList } from './types';
import { navigationRef } from './navigationRef';

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

import InstructorDashboardScreen from '../screens/InstructorDashboardScreen';
import InstructorSessionsScreen from '../screens/InstructorSessionsScreen';
import InstructorFeedbackScreen from '../screens/InstructorFeedbackScreen';

import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import StudentSessionsScreen from '../screens/StudentSessionsScreen';
import StudentFeedbackScreen from '../screens/StudentFeedbackScreen';
import AiChatScreen from '../screens/AiChatScreen';
import StudentCoursePickerScreen from '../screens/StudentCoursePickerScreen';
import { MiniChatWidget } from '../components/MiniChatWidget';
import { BackHandler, Alert } from 'react-native';

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
  </AdminTab.Navigator>
);

const InstructorTabs = () => (
  <InstructorTab.Navigator screenOptions={commonTabOptions}>
    <InstructorTab.Screen name="Dashboard" component={InstructorDashboardScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
    <InstructorTab.Screen name="Sessions" component={InstructorSessionsScreen} options={{ tabBarIcon: () => <Text>🗓️</Text> }} />
    <InstructorTab.Screen name="Feedback" component={InstructorFeedbackScreen} options={{ tabBarIcon: () => <Text>💬</Text> }} />
  </InstructorTab.Navigator>
);

const StudentTabs = () => (
  <StudentTab.Navigator screenOptions={commonTabOptions}>
    <StudentTab.Screen name="Dashboard" component={StudentDashboardScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
    <StudentTab.Screen name="Sessions" component={StudentSessionsScreen} options={{ tabBarIcon: () => <Text>📍</Text> }} />
    <StudentTab.Screen name="Feedback" component={StudentFeedbackScreen} options={{ tabBarIcon: () => <Text>💬</Text> }} />
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
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    const onBackPress = () => {
      // If we are at the top level of the stack, maybe show an exit alert 
      // or prevent exit if it's annoying the user.
      const canGoBack = navigationRef.canGoBack();
      if (!canGoBack && user) {
        Alert.alert('Hold on!', 'Are you sure you want to exit the app?', [
          { text: 'Cancel', onPress: () => null, style: 'cancel' },
          { text: 'YES', onPress: () => BackHandler.exitApp() },
        ]);
        return true; // Prevent default behavior
      }
      return false; // Let navigation handle it
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [user]);

  const shouldShowFloatingAi = useMemo(() => {
    if (!user) return false;
    // We show the mini chat everywhere when logged in
    return true;
  }, [user]);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
      onStateChange={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        {user ? (
          <>
            {user.role === 'admin' ? (
              <Stack.Screen name="AdminTabs" component={AdminTabs} />
            ) : user.role === 'instructor' ? (
              <Stack.Screen name="InstructorTabs" component={InstructorTabs} />
            ) : (
              <Stack.Screen name="StudentTabs" component={StudentTabs} />
            )}
            <Stack.Screen name="AiChat" component={AiChatScreen} />
            <Stack.Screen name="StudentCoursePicker" component={StudentCoursePickerScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>

      {shouldShowFloatingAi ? <MiniChatWidget /> : null}
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
