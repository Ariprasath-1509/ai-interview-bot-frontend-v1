import type { NextConfig } from "next";

/** Allow TensorFlow.js to fetch model weights from Google CDN (browser-side proctoring). */
const proctoringCsp =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "media-src 'self' blob:; " +
  "worker-src 'self' blob:; " +
  "connect-src 'self' https://storage.googleapis.com https://www.gstatic.com blob: data:; " +
  "font-src 'self' data:;";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/interview/:path*",
        headers: [{ key: "Content-Security-Policy", value: proctoringCsp }],
      },
    ];
  },
};

export default nextConfig;
