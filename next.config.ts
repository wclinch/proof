import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // pdfjs-dist requires canvas in its Node.js code path; mark it external
  // so Next.js doesn't try to bundle it (extraction only runs client-side)
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
  turbopack: {
    resolveAlias: {
      canvas: './lib/canvas-stub.js',
    },
  },
};

export default nextConfig;
