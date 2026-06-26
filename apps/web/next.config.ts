import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@automated-reviews/core", "@automated-reviews/temporal"],
};

export default nextConfig;
