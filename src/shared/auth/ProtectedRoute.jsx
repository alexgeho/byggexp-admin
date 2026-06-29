import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/src/store/authStore';

function AuthRedirect({ to }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="auth-guard-loading">
      <Spin size="large">
        <span className="auth-guard-loading__text">Redirecting...</span>
      </Spin>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated && !user) {
    return (
      <div className="auth-guard-loading">
        <Spin size="large">
          <span className="auth-guard-loading__text">Restoring session...</span>
        </Spin>
      </div>
    );
  }

  if (!user) {
    return <AuthRedirect to="/login" />;
  }

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      return <AuthRedirect to="/unauthorized" />;
    }
  }

  return children;
}
