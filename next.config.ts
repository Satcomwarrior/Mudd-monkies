import type { NextConfig } from "next";
import path from "path";

const canvasShimPath = path.resolve(__dirname, "src/shims/canvas.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: canvasShimPath,
      },
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: canvasShimPath,
    };
    return config;
  },
};

export default nextConfig;
