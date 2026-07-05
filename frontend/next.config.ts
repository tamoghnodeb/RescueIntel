import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In local development, proxy /api requests to the local Python FastAPI server.
    // In production (Vercel), vercel.json will handle the routing directly to the serverless Python functions.
    return process.env.NODE_ENV === 'development' ? [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ] : [];
  },
};

export default nextConfig;
