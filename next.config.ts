import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Next.js to optimize remote article images from the Babylovegrowth blog.
    // NOTE: '*' is an open proxy risk — narrow `hostname` to Babylovegrowth's actual
    // image host (e.g. their CDN/storage domain) once we see a real article's image URL.
    remotePatterns: [
      { protocol: 'https', hostname: '*' },
    ],
  },
};

export default nextConfig;
