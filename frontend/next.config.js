/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Temporarily ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
  // Rewrite specific API calls to FastAPI backend
  // Note: /api/chat is handled by Next.js API route (BFF pattern)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      // Document upload/management → FastAPI backend
      {
        source: '/api/documents/:path*',
        destination: `${backendUrl}/api/documents/:path*`,
      },
      // Health check → FastAPI backend
      {
        source: '/api/health',
        destination: `${backendUrl}/api/health`,
      },
      // Metrics → FastAPI backend
      {
        source: '/api/metrics/:path*',
        destination: `${backendUrl}/api/metrics/:path*`,
      },
      // Info endpoint → FastAPI backend
      {
        source: '/api/info',
        destination: `${backendUrl}/api/info`,
      },
      // Note: /api/chat is NOT rewritten - handled by Next.js API route
      // Note: /api/context is called server-side from route.ts, not rewritten
    ];
  },
}

module.exports = nextConfig