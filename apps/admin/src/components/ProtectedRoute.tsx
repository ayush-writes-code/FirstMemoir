import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '@repo/api-client';
import type { User } from '@repo/api-client';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const res = await auth.getMe();
        if (mounted) {
          if (res.success && res.data?.user?.role === 'ADMIN') {
            setUser(res.data.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    checkAuth();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8620A]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
