import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
