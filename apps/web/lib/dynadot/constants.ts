export const DYNADOT_BASE_URL =
  process.env.DYNADOT_BASE_URL || "https://api.dynadot.com/api3.json";
export const DYNADOT_API_KEY = process.env.DYNADOT_API_KEY || "";
export const DYNADOT_COUPON = process.env.DYNADOT_COUPON || "";

// TODO: this logic is hard-coded for now, but we'll make it dynamic in the future
export const DOMAIN_REGISTRATION_ELIGIBLE_WORKSPACES = [
  "clrei1gld0002vs9mzn93p8ik",
  "ws_1JT00MX4K1KQFMT2FEF6413XT",
  "ws_1KJTC56GDYF3P9AHXSAQS5RGW",
];
