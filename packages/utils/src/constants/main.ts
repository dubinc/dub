export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Dub.co";

export const SHORT_DOMAIN =
  process.env.NEXT_PUBLIC_APP_SHORT_DOMAIN || "dub.sh";

export const HOME_DOMAIN = `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;

export const APP_HOSTNAMES = new Set([
  `app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  "localhost:8888",
  "localhost",
]);

export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : "http://localhost:8888";

export const APP_DOMAIN_WITH_NGROK =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : process.env.NEXT_PUBLIC_NGROK_URL || "http://localhost:8888";

export const API_HOSTNAMES = new Set([
  `api.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `api-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `api.${SHORT_DOMAIN}`,
  "api.localhost:8888",
]);

export const API_DOMAIN =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://api.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://api-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : "http://api.localhost:8888";

export const ADMIN_HOSTNAMES = new Set([
  `admin.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  "admin.localhost:8888",
]);

export const PARTNERS_HOSTNAMES = new Set([
  `partners.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `partners-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  "partners.localhost:8888",
]);

export const PARTNERS_DOMAIN =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://partners.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://partners-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : "http://partners.localhost:8888";

export const PARTNERS_DOMAIN_WITH_NGROK =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://partners.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://partners-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : process.env.NEXT_PUBLIC_NGROK_URL || "http://partners.localhost:8888";

export const DUB_LOGO = "https://assets.dub.co/logo.png";
export const DUB_QR_LOGO = "https://assets.dub.co/logo.png";
export const DUB_WORDMARK = "https://assets.dub.co/wordmark.png";
export const DUB_THUMBNAIL = "https://assets.dub.co/thumbnail.jpg";

export const DUB_WORKSPACE_ID = "cl7pj5kq4006835rbjlt2ofka";
export const ACME_WORKSPACE_ID = "clrei1gld0002vs9mzn93p8ik";
export const LEGAL_WORKSPACE_ID = "clrflia0j0000vs7sqfhz9c7q";
export const LEGAL_USER_ID = "clqei1lgc0000vsnzi01pbf47";

export const R2_URL = process.env.STORAGE_BASE_URL as string;
