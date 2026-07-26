'use client';

import { Suspense } from 'react';
import InvitePage from '@/src/features/auth/InvitePage';

export default function InviteRoute() {
  return (
    <Suspense fallback={null}>
      <InvitePage />
    </Suspense>
  );
}
