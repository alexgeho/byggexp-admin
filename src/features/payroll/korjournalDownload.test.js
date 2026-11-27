import { describe, expect, it } from 'vitest';
import { filenameFrom } from './korjournalDownload';

describe('körjournal download', () => {
  it('takes the UTF-8 filename from the header', () => {
    expect(filenameFrom("attachment; filename*=UTF-8''korjournal-%C3%85sa-2026-11-01_2026-11-30.pdf", 'x.pdf'))
      .toBe('korjournal-Åsa-2026-11-01_2026-11-30.pdf');
  });

  it('falls back when the header is missing or broken', () => {
    expect(filenameFrom(undefined, 'x.pdf')).toBe('x.pdf');
    expect(filenameFrom("attachment; filename*=UTF-8''%E0%A4%A", 'x.pdf')).toBe('x.pdf');
  });
});
