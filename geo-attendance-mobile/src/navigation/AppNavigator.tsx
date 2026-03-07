import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import Colors from '../theme/colors';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SplashScreen: React.FC = () => (
  <View style={splash.container}>
    <Text style={splash.emoji}>📍</Text>
    <Text style={splash.title}>GeoAttend</Text>
    <ActivityIndicator
      color={Colors.primary}
      size="large"
      style={{ marginTop: 32 }}
    />
  </View>
);

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

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
          // Authenticated stack
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // Unauthenticated stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
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
  emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
});

export default AppNavigator;
