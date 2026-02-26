import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';
import { MapPin, CheckCircle, Clock } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { SessionCard } from '../../components/ui/SessionCard.tsx';
import { GeofenceMap } from '../../components/ui/GeofenceMap.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { studentApi } from '../../services/mockApi.ts';
import type { Session, CheckIn } from '../../types/index.ts';
import toast from 'react-hot-toast';

export function StudentHomePage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const activeSession = sessions[0];

  useEffect(() => {
    if (!user) return;
    studentApi.getActiveSessions(user.id).then(setSessions).finally(() => setLoading(false));
  }, [user]);

  // Recent check-ins are updated when user checks in (handleCheckIn appends to checkIns state)

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setUserLocation(null)
    );
  }, []);

  const handleCheckIn = async () => {
    if (!activeSession || !user || !userLocation) {
      toast.error('Allow location access to check in.');
      return;
    }
    setCheckingIn(true);
    try {
      const result = await studentApi.checkIn(activeSession.id, user.id, userLocation.lat, userLocation.lng);
      setCheckIns((prev) => [...prev, result]);
      toast.success(result.locationVerified ? 'Checked in successfully!' : 'Check-in recorded (outside geofence).');
    } catch {
      toast.error('Check-in failed.');
    } finally {
      setCheckingIn(false);
    }
  };

  const insideGeofence = activeSession && userLocation && (() => {
    const R = 6371e3;
    const φ1 = (activeSession.lat * Math.PI) / 180;
    const φ2 = (userLocation.lat * Math.PI) / 180;
    const Δφ = ((userLocation.lat - activeSession.lat) * Math.PI) / 180;
    const Δλ = ((userLocation.lng - activeSession.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c) <= activeSession.geofenceRadiusMeters;
  })();

  return (
    <AppShell title="Home">
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 w-full rounded-xl" />
          <LoadingSkeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !activeSession ? (
        <EmptyState title="No active session" description="There is no class to check into right now." />
      ) : (
        <div className="space-y-6">
          <SessionCard session={activeSession} />
          <Countdown endTime={activeSession.endTime} />
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <GeofenceMap
              center={{ lat: activeSession.lat, lng: activeSession.lng }}
              radiusMeters={activeSession.geofenceRadiusMeters}
              userLocation={userLocation}
              height="220px"
            />
            <div className="p-3 flex items-center gap-2 border-t border-gray-100">
              {insideGeofence != null ? (
                insideGeofence ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                    <CheckCircle className="h-4 w-4" /> Inside geofence
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-danger">
                    <MapPin className="h-4 w-4" /> Outside geofence
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" /> Allow location to see status
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary/90 disabled:opacity-60 transition-all duration-200 animate-pulse focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {checkingIn ? 'Checking in...' : 'Check in'}
          </button>
          {checkIns.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Recent check-ins</h2>
              <ul className="space-y-2">
                {checkIns.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-900">{c.userName}</span>
                    <span className="text-xs text-gray-500">{new Date(c.checkedInAt).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Countdown({ endTime }: { endTime: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const end = new Date(endTime).getTime();
    const tick = () => setSeconds(Math.max(0, differenceInSeconds(new Date(end), new Date())));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <Clock className="h-5 w-5 text-primary" />
      <span className="font-mono text-lg font-semibold">
        {m}:{s.toString().padStart(2, '0')} left
      </span>
    </div>
  );
}
