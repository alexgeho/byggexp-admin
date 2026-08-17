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
};

export default nextConfig;
