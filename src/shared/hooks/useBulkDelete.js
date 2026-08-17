import { useCallback } from 'react';
import { getEntityId } from '@/src/utils/entityId';
import { appMessage } from '@/src/utils/appMessage';

/**
 * Standardises the "delete selected rows" action shared by every AdminTable.
 * Pass a store `remove(id)` function and (optionally) a refresh callback; the
 * returned handler is what AdminTable's `onBulkDelete` expects.
 *
 * Each row is removed independently so one failure doesn't abort the rest, and
 * the promise never rejects (AdminTable's confirm dialog stays responsive). The
 * per-entity stores already toast their own success/error, so we only add a
 * short summary when some rows fail.
 */
export default function useBulkDelete(removeFn, onDone) {
  return useCallback(
    async (rows) => {
      let failed = 0;

      for (const row of rows) {
        const id = getEntityId(row) ?? row?._id;
        if (!id) {
          continue;
        }

        try {
          await removeFn(id);
        } catch {
          failed += 1;
        }
      }

      if (failed > 0) {
        appMessage.error('Some items could not be deleted');
      }

      await onDone?.();
    },
    [onDone, removeFn],
  );
}
