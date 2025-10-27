// system url
export const systemUrl = `${process.env.NEXT_PUBLIC_SYSTEM_PAYMENT_API_URL}`;

// system headers
export const systemHeaders = {
  "X-API-Key": process.env.SYSTEM_PAYMENT_API_KEY,
  "Content-Type": "application/json",
};
