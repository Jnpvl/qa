import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "**.devtunnels.ms"],
  async rewrites() {
    const apiTarget = (process.env.QA_API_PROXY_TARGET ?? "http://127.0.0.1:4000").replace(/\/$/, "")
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }]
  },
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
