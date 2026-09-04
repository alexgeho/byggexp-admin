'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// When a list page is opened with `?create=1` (e.g. from the getting-started
// checklist), fire its create flow once on mount. Research: each onboarding step
// should open directly into the action that completes it, not just land on a
// list the user then has to figure out.
export default function useAutoOpenCreate(open) {
  const params = useSearchParams();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    if (params?.get('create') === '1' && typeof open === 'function') {
      fired.current = true;
      open();
      // Strip ?create=1 from the URL bar (synchronously, without a Next
      // navigation/remount) so refreshing, going back, or re-clicking the page
      // in the sidebar doesn't reopen the modal.
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('create');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      } catch { /* ignore */ }
    }
  }, [params, open]);
}
