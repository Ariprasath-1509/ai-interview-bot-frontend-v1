import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-webgl",
    "@tensorflow/tfjs-backend-cpu",
    "@tensorflow-models/coco-ssd",
    "@tensorflow-models/blazeface",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/interview/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self)" }],
      },
    ];
  },
};

export default nextConfig;
