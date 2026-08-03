'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/authStore';

export default function AuthHydrator({ children }) {
  useEffect(() => {
    useAuthStore.getState().hydrateSession();
    // Proactively refresh once on load so a session with an expired access token
    // (but a still-valid refresh token) recovers without a manual re-login.
    void useAuthStore.getState().refreshSession();
  }, []);

  return children;
}
