import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'better-sqlite3': false,
        'net': false,
        'tls': false,
        'fs': false,
        'http': false,
        'https': false,
        'stream': false,
        'crypto': false,
        'child_process': false,
        'os': false,
        'path': false,
        'zlib': false,
      };
    }

    return config;
  },
  serverExternalPackages: ['better-sqlite3', 'googleapis']
};

export default nextConfig;
