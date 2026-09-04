'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// When a list page is opened with `?create=1` (e.g. from the getting-started
// checklist), fire its create flow once on mount. Research: each onboarding step
// should open directly into the action that completes it, not just land on a
// list the user then has to figure out.
export default function useAutoOpenCreate(open) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    if (params?.get('create') === '1' && typeof open === 'function') {
      fired.current = true;
      open();
      // Strip ?create=1 from the URL so the modal doesn't reopen on refresh,
      // back, or when re-clicking the page in the sidebar.
      try { router.replace(pathname, { scroll: false }); } catch { /* ignore */ }
    }
  }, [params, open, router, pathname]);
}
