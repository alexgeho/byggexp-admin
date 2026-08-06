import { useEffect, useRef } from 'react';
import { useOutletContext } from '@/src/shared/routing/routerCompat';

// Register this page's primary "+ Add" action in the shared dashboard header and
// clear it on unmount. Every list page used to repeat this register/unregister
// effect by hand — centralising it removes that copy-paste and, just as
// importantly, encodes the loop-safe pattern: the handler is read through a ref,
// so its identity never lands in the dependency array and can't re-register on
// every render (the bug that once froze navigation on the detail pages).
//
// Pass in `deps` only values that should change the *label* (or nothing at all).
export default function useAddButton(handler, label, deps = []) {
  const ctx = useOutletContext() || {};
  const { registerAddButton, unregisterAddButton } = ctx;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!registerAddButton) return undefined;
    registerAddButton((...args) => handlerRef.current?.(...args), label);
    return () => unregisterAddButton?.();
    // handler read via ref on purpose; re-run only when the header hooks, label
    // or explicit deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAddButton, unregisterAddButton, label, ...deps]);
}
