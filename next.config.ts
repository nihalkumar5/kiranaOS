import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images from external domains (Unsplash etc. used in store catalog)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
  },
};

export default nextConfig;
