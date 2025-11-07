export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Dub.co";

export const SHORT_DOMAIN = process.env.NEXT_PUBLIC_APP_SHORT_DOMAIN;

export const APP_URL = process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.VERCEL_BRANCH_URL;

export const HOME_DOMAIN = `https://${APP_URL}`;

export const APP_HOSTNAMES = new Set([
  APP_URL,
  `app-${APP_URL}`,
  `app.${APP_URL}`,
  `preview.${APP_URL}`,
  "localhost:8888",
  "localhost",
]);

// export const APP_DOMAIN =
//   process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
//     ? `https://app.${APP_URL}`
//     : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
//       ? `https://preview.${APP_URL}`
//       : "http://localhost:8888";

// export const APP_DOMAIN = `https://app-${APP_URL}`;
export const APP_DOMAIN = `https://${APP_URL}`;

// export const APP_DOMAIN_WITH_NGROK =
//   process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
//     ? `https://app.${APP_URL}`
//     : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
//       ? `https://preview.${APP_URL}`
//       : process.env.NEXT_PUBLIC_NGROK_URL || "http://localhost:8888";

export const APP_DOMAIN_WITH_NGROK = `https://app-${APP_URL}`;

export const API_HOSTNAMES = new Set([
  `${process.env.NEXT_PUBLIC_API_DOMAIN}`,
  `api-${APP_URL}`,
  `api.${APP_URL}`,
  `api-staging.${APP_URL}`,
  `api.${SHORT_DOMAIN}`,
  "api.localhost:8888",
]);

// export const API_DOMAIN =
//   process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
//     ? `https://api.${APP_URL}`
//     : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
//       ? `https://api-staging.${APP_URL}`
//       : "http://api.localhost:8888";

export const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_API_DOMAIN}`
  : `https://api-${APP_URL}`;

// export const ADMIN_HOSTNAMES = new Set([
//   `admin.${APP_URL}`,
//   "admin.localhost:8888",
// ]);

// export const PARTNERS_DOMAIN =
//   process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
//     ? `https://partners.${APP_URL}`
//     : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
//       ? `https://partners-staging.${APP_URL}`
//       : "http://partners.localhost:8888";

// export const PARTNERS_HOSTNAMES = new Set([
//   `partners.${APP_URL}`,
//   `partners-staging.${APP_URL}`,
//   "partners.localhost:8888",
// ]);

export const DUB_LOGO = "https://assets.dub.co/logo.png";
export const DUB_QR_LOGO = "https://assets.dub.co/logo.png";
export const DUB_WORDMARK = "https://assets.dub.co/wordmark.png";
export const DUB_THUMBNAIL = "https://assets.dub.co/thumbnail.jpg";

export const DUB_WORKSPACE_ID = "cl7pj5kq4006835rbjlt2ofka";
export const ACME_WORKSPACE_ID = "clrei1gld0002vs9mzn93p8ik";
export const LEGAL_WORKSPACE_ID = "clrflia0j0000vs7sqfhz9c7q";
export const LEGAL_USER_ID = "clqei1lgc0000vsnzi01pbf47";

export const R2_URL = process.env.STORAGE_BASE_URL as string;
