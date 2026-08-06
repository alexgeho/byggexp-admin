import { useEffect, useRef } from 'react';
import { useOutletContext } from '@/src/shared/routing/routerCompat';

// Register this page's secondary header action (next to the primary "+ Add"),
// and clear it on unmount. Used to lift a page's secondary control — bulk import,
// or Scan on expenses / purchase invoices — up from the table toolbar into the
// page header. Same loop-safe shape as useAddButton: the handler is read through
// a ref so it never lands in the dependency array.
export default function useBulkButton(handler, label, deps = []) {
  const ctx = useOutletContext() || {};
  const { registerBulkButton, unregisterBulkButton } = ctx;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!registerBulkButton) return undefined;
    registerBulkButton((...args) => handlerRef.current?.(...args), label);
    return () => unregisterBulkButton?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerBulkButton, unregisterBulkButton, label, ...deps]);
}
