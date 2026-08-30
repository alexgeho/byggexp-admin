import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  // Tree-shake the large antd / icon barrels so only used modules ship.
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },
  // admin.byggexp.se is a private app and must never be indexed. Emit a global
  // noindex header so Google drops it from the index (GSC flagged /login as
  // "Duplicate without user-selected canonical"). Paired with public/robots.txt.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
