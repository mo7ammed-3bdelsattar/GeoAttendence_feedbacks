import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../stores/authStore.ts';

interface RoleGuardProps {
  requiredRole: string;
  children: React.ReactNode;
  screen?: string;
}

export function RoleGuard({ requiredRole, children, screen }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const currentRole = user?.role ?? 'guest';
  const mismatch = Boolean(user && currentRole !== requiredRole);

  useEffect(() => {
    if (!mismatch || !user) return;

    const logMismatch = async () => {
      try {
        const auditCollection = collection(db, 'auditLogs', 'roleMismatch', 'events');
        await addDoc(auditCollection, {
          userId: user.id,
          currentRole,
          requiredRole,
          screen: screen || window.location.pathname,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error('Unable to log role mismatch', error);
      }
    };

    logMismatch();
  }, [mismatch, user, currentRole, requiredRole, screen]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-red-900">محتاج تسجيل دخول</h2>
          <p className="mt-4 text-sm text-red-700">لا يمكنك الوصول لهذه الصفحة إلا بعد تسجيل الدخول.</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            اذهب لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (mismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-3xl border border-yellow-200 bg-yellow-50 p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-yellow-900">أنت مسجل كـ {currentRole}</h2>
          <p className="mt-4 text-sm text-yellow-800">
            الشاشة دي مخصصة لـ {requiredRole} بس.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
          >
            اختر دورك الصح
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
