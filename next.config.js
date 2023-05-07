const { withContentlayer } = require("next-contentlayer");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [
      "www.google.com",
      "avatar.vercel.sh",
      "faisalman.github.io",
      "avatars.dicebear.com",
      "res.cloudinary.com",
      "pbs.twimg.com",
      "d2vwwcvoksz7ty.cloudfront.net",
    ],
  },
  async headers() {
    return [
      {
        source: "/login",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
      {
        source: "/register",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
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
        ],
      },
    ];
  },
};

module.exports = withContentlayer(nextConfig);
