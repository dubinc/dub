export const isProduction = process.env.NODE_ENV === "production";
export const isLocalDev = process.env.NODE_ENV === "development";
export const isCI = process.env.CI === "true";
export const isVercelDeployment = process.env.VERCEL === "1";

export const shouldApplyRateLimit = !(isCI || isLocalDev);
