import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize heavy package imports for faster builds and lighter client bundles
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Images from external domains (Unsplash etc. used in store catalog)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
  },
};

export default nextConfig;
