/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: { images: { allowFutureImage: true } },
  images: {
    domains: ["logo.clearbit.com", "avatar.tobi.sh"],
  },
};
