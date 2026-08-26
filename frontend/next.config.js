/** @type {import('next').NextConfig} */

// Everything the browser is allowed to reach: itself, and the local backend.
// 'unsafe-eval' is required by Next.js dev tooling; 'unsafe-inline' by the
// theme bootstrap script and Tailwind's inline styles. ws: keeps dev HMR
// working. There are no external hosts, which is the point.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 ws: wss:",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  // Pin workspace root to this directory so Next.js doesn't pick a stray
  // package-lock.json elsewhere on the machine (e.g. ~/package-lock.json).
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Dev convenience: same-origin /api/* proxies to the local backend, so the
  // health probe works without CORS in play. The api-client talks to
  // NEXT_PUBLIC_API_URL directly for everything else.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      { source: '/api/documents/:path*', destination: `${backendUrl}/api/documents/:path*` },
      { source: '/api/health', destination: `${backendUrl}/api/health` },
      { source: '/api/models', destination: `${backendUrl}/api/models` },
    ];
  },
}

module.exports = nextConfig
