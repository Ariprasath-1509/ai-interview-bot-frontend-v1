import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverActions: {
    bodySizeLimit: "4mb",
  },
  experimental: {
    serverActionsBodySizeLimit: "4mb",
  },
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
