import { waitUntil as waitUntilHelper } from "@vercel/functions";

export const waitUntil = (fn: Promise<any>) => {
  if (process.env.VERCEL === "1") {
    waitUntilHelper(fn);
  } else {
    return fn;
  }
};
