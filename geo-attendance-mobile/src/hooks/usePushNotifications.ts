import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications'; // Commented out to prevent Expo Go SDK 53 crash
import Constants from 'expo-constants';
import { userApi } from '../services/api';

/*
// Only set handler if NOT in Expo Go (to avoid immediate crash on SDK 53)
if (Constants.appOwnership !== 'expo' || Platform.OS === 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
*/

export function usePushNotifications(user: { id: string } | null) {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<any>(undefined);
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);

  useEffect(() => {
    /* 
    // Notifications disabled due to Expo Go bug in SDK 53
    let isMounted = true;
    const isExpoGo = Constants.appOwnership === 'expo' && Platform.OS !== 'web';

    async function registerForPushNotificationsAsync() {
      if (isExpoGo) return;
      // ... (rest of logic)
    }
    */
  }, [user]);

  return { expoPushToken, notification };
}
