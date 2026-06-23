import { useEffect, useState } from 'react';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { getRedirectPathForUser, useAuthStore } from '@/src/store/authStore';

function parseCallbackParams() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const searchParams = new URLSearchParams(window.location.search);

  const accessToken =
    hashParams.get('access_token') || searchParams.get('access_token');
  const refreshToken =
    hashParams.get('refresh_token') || searchParams.get('refresh_token');
  const userRaw = hashParams.get('user') || searchParams.get('user');

  if (!accessToken || !refreshToken || !userRaw) {
    return null;
  }

  try {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: JSON.parse(userRaw),
    };
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const data = parseCallbackParams();

    if (!data) {
      setError('Invalid or expired sign-in link.');
      return;
    }

    useAuthStore.getState().setSession(data);
    window.history.replaceState({}, document.title, '/auth/callback');

    const redirectPath = getRedirectPathForUser(data.user);
    navigate(redirectPath, { replace: true });
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="login-card">
        {error ? (
          <>
            <h2 className="login-card-title">Sign-in failed</h2>
            <p className="login-card-subtitle">{error}</p>
          </>
        ) : (
          <>
            <h2 className="login-card-title">Signing you in...</h2>
            <p className="login-card-subtitle">Redirecting to your dashboard.</p>
          </>
        )}
      </div>
    </div>
  );
}
