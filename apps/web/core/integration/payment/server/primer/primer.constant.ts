// primer url
export const primerUrl = `${process.env.NEXT_PUBLIC_PRIMER_PAYMENT_API_URL}`;

// primer headers
export const primerHeaders = {
  "X-Api-Key": `${process.env.PRIMER_PAYMENT_API_KEY}`,
  "X-Api-Version": "2.2",
  "Content-Type": "application/json",
};

// primer headers readonly
export const primerHeadersReadonly = {
  "X-Api-Key": `${process.env.NEXT_PUBLIC_PRIMER_PAYMENT_API_KEY_READONLY}`,
  "X-Api-Version": "2.2",
  "Content-Type": "application/json",
};
