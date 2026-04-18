import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import RoleMismatchModal from '../components/RoleMismatchModal';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

interface RoleGuardProps {
  requiredRole: 'student' | 'faculty' | 'admin';
  children: React.ReactNode;
  screen: string;
  navigation: any; // from react-navigation
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRole,
  children,
  screen,
  navigation,
}) => {
  const { user } = useAuth();
  const currentRole = user?.role;

  const handleNavigateToLogin = () => {
    // Navigate to role selection or login
    navigation.navigate('Login');
  };

  React.useEffect(() => {
    if (currentRole && currentRole !== requiredRole) {
      // Log to Firestore
      addDoc(collection(db, 'auditLogs', 'roleMismatch'), {
        userId: user?.uid,
        currentRole,
        requiredRole,
        screen,
        timestamp: new Date(),
      }).catch(console.error);
    }
  }, [currentRole, requiredRole, screen, user?.uid]);

  if (!currentRole || currentRole !== requiredRole) {
    return (
      <RoleMismatchModal
        visible={true}
        currentRole={currentRole}
        requiredRole={requiredRole}
        onNavigateToLogin={handleNavigateToLogin}
      />
    );
  }

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default RoleGuard;