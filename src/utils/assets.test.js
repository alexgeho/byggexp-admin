import { describe, it, expect } from 'vitest';
import { resolveSvgSrc, isImageFile } from './assets';

describe('resolveSvgSrc', () => {
  it('returns strings unchanged', () => {
    expect(resolveSvgSrc('/logo.svg')).toBe('/logo.svg');
  });
  it('unwraps the .src of an imported asset object', () => {
    expect(resolveSvgSrc({ src: '/x.svg' })).toBe('/x.svg');
  });
});

describe('isImageFile', () => {
  it('detects by mime type', () => {
    expect(isImageFile({ mimeType: 'image/png' })).toBe(true);
    expect(isImageFile({ mimeType: 'application/pdf' })).toBe(false);
  });
  it('falls back to the url extension', () => {
    expect(isImageFile({ url: 'photo.JPG' })).toBe(true);
    expect(isImageFile({ url: 'a.webp' })).toBe(true);
    expect(isImageFile({ url: 'report.pdf' })).toBe(false);
  });
  it('is empty-safe', () => {
    expect(isImageFile({})).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });
});
