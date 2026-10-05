import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // allow proxy host headers
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
