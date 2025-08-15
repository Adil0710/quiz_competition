import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // This will ignore ESLint errors during builds (e.g., on Vercel)
    ignoreDuringBuilds: true,
  },
  /* other config options here */
};

export default nextConfig;
