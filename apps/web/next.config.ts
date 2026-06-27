import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: [
    "@temporalio/client",
    "@temporalio/common",
    "@temporalio/proto",
    "@grpc/grpc-js",
    "long",
    "nexus-rpc",
    "uuid",
  ],
  transpilePackages: ["@automated-reviews/core", "@automated-reviews/temporal"],
};

export default nextConfig;
