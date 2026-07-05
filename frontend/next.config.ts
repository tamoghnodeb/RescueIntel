import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return process.env.NODE_ENV === 'development' ? [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8000/api/backend/:path*',
      },
    ] : [];
  },
};

export default nextConfig;
