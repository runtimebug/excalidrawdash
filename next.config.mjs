// Baseline security headers applied to every response. Deliberately conservative
// (no strict CSP) so the bundled Excalidraw editor keeps working; the app renders
// only its own first-party assets and same-origin API.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pg / bcryptjs are server-only native-ish deps; keep them out of the bundle.
  experimental: {
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
