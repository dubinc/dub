const { withContentlayer } = require("next-contentlayer");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    useDeploymentId: true,
    serverActions: true,
    useDeploymentIdServerActions: true,
  },
  images: {
    domains: [
      "www.google.com",
      "avatar.vercel.sh",
      "faisalman.github.io",
      "avatars.dicebear.com",
      "res.cloudinary.com",
      "pbs.twimg.com",
      "d2vwwcvoksz7ty.cloudfront.net",
      "kmky9fhozdrax28c.public.blob.vercel-storage.com", // Vercel Blob
      "lh3.googleusercontent.com",
      "media.cleanshot.cloud", // only for staging purposes
    ],
  },
  async headers() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "dub.sh" }],
        headers: [
          {
            key: "cdn-cache-control",
            value: "max-age=300",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

module.exports = withContentlayer(nextConfig);
