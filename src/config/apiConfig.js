export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_API_URL. Add it to .env.local and restart the Next.js server.');
}
