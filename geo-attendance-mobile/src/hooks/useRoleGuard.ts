import { useEffect, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === 'instructor') return 'faculty';
  return role;
};

export function useRoleGuard(requiredRole: 'student' | 'faculty' | 'admin') {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);
  const mismatch = Boolean(user && currentRole !== requiredRole);

  useEffect(() => {
    if (!mismatch || !user) return;

    const audit = async () => {
      try {
        const auditCollection = collection(db, 'auditLogs', 'roleMismatch', 'events');
        await addDoc(auditCollection, {
          userId: user.uid,
          currentRole: currentRole ?? 'unknown',
          requiredRole,
          screen: 'mobile',
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to log mobile role mismatch', error);
      }
    };

    audit();
  }, [mismatch, user, currentRole, requiredRole]);

  return useMemo(
    () => ({
      mismatch,
      currentRole: currentRole ?? 'unknown',
    }),
    [mismatch, currentRole]
  );
}
