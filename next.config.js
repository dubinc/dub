const { withContentlayer } = require("next-contentlayer");

const REDIRECT_SEGMENTS = [
  "pricing",
  "blog",
  "help",
  "changelog",
  "tools",
  "stats",
  "_static",
];

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
      "lh3.googleusercontent.com",
      "media.cleanshot.cloud", // only for staging purposes
    ],
  },
  async headers() {
    return [
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
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "app.dub.sh",
          },
        ],
        destination: "https://app.dub.co",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "app.dub.sh",
          },
        ],
        destination: "https://app.dub.co/:path*",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "dub.sh",
          },
        ],
        destination: "https://dub.co",
        permanent: true,
        statusCode: 301,
      },
      ...REDIRECT_SEGMENTS.map(
        (segment) => (
          {
            source: `/${segment}`,
            has: [
              {
                type: "host",
                value: "dub.sh",
              },
            ],
            destination: `https://dub.co/${segment}`,
            permanent: true,
            statusCode: 301,
          },
          {
            source: `/${segment}/:path*`,
            has: [
              {
                type: "host",
                value: "dub.sh",
              },
            ],
            destination: `https://dub.co/${segment}/:path*`,
            permanent: true,
            statusCode: 301,
          }
        ),
      ),
      {
        source: "/metatags",
        has: [
          {
            type: "host",
            value: "dub.sh",
          },
        ],
        destination: "https://dub.co/tools/metatags",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/metatags",
        has: [
          {
            type: "host",
            value: "dub.co",
          },
        ],
        destination: "/tools/metatags",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "staging.dub.sh",
          },
        ],
        destination: "https://dub.co",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "preview.dub.sh",
          },
        ],
        destination: "https://preview.dub.co",
        permanent: true,
        statusCode: 301,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "admin.dub.sh",
          },
        ],
        destination: "https://admin.dub.co",
        permanent: true,
        statusCode: 301,
      },
    ];
  },
};

module.exports = withContentlayer(nextConfig);
