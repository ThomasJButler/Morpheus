/** @type {import('next').NextConfig} */

// Everything the browser is allowed to reach: itself, and the local backend.
// Development builds need 'unsafe-eval' (Next.js dev tooling) and ws: (HMR);
// production builds get neither (second-pass review F33). 'unsafe-inline'
// stays: the theme bootstrap script and Tailwind's inline styles need it.
// connect-src follows NEXT_PUBLIC_API_URL, so a custom backend address is
// not blocked by the policy that exists to protect it.
const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const connectSources = Array.from(
  new Set(["'self'", apiUrl, 'http://127.0.0.1:8000', 'http://localhost:8000']),
);
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(' ')}${isDev ? ' ws: wss:' : ''}`,
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
