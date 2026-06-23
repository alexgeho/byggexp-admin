'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/authStore';

export default function AuthHydrator({ children }) {
  useEffect(() => {
    useAuthStore.getState().hydrateSession();
  }, []);

  return children;
}
