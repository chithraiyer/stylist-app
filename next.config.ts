import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client photos are resized in the browser, but allow a little headroom.
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: { unoptimized: true },
};

export default nextConfig;
