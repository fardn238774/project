import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Seller listings upload photos and a walkaround video through a server
    // action; the default limit is only 1 MB, so raise it to fit them.
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
