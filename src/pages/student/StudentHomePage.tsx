import { useState, useEffect } from 'react';

import { AppShell } from '../../components/layout/AppShell.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { useAuthStore } from '../../stores/authStore.ts';


export function StudentHomePage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);


 


 

  

  return (
    <AppShell title="Home">
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 w-full rounded-xl" />
          <LoadingSkeleton className="h-64 w-full rounded-xl" />
        </div>
      ) :(
        <div className="space-y-6">
          
        
        </div>
      )}
    </AppShell>
  );
}


