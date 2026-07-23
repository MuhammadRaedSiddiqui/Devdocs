// next.config.mjs

const nextConfig = {
  // Allow cross-origin requests from the API server in development
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Forward /api/* requests to the Hono API server in development.
  // In production, the API server is on a separate subdomain (api.devdocs.ai)
  // and CORS is configured there — this rewrite is dev-only.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source:      "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/:path*`,
      },
    ];
  },
  // Suppress the "missing suspense boundary" warning during dev — all dynamic
  // pages in this project use client-side data fetching, not server-side rendering
  experimental: {
    // Enable the Turbopack bundler for faster local dev builds
    // Remove this line if you're on Next.js < 14.2
    turbo: {},
  },
};

export default nextConfig;
