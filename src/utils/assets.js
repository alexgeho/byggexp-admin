// Small asset/file helpers shared across the app.

// Next.js static SVG imports are `{ src }` objects in prod but plain strings in
// some setups — normalise to a usable src string.
export const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

// Is this uploaded file an image (by mime type, or by extension as a fallback)?
export const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};
