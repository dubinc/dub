import { Client, Receiver } from "@upstash/qstash";
import Bottleneck from "bottleneck";

// we're using Bottleneck to avoid running into Resend's rate limit of 10 req/s
export const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum concurrent requests
  minTime: 100, // minimum time between requests in ms
});

// we're using Upstash's Receiver to verify the request signature
export const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

export const verifySignature = async (req: Request) => {
  const authHeader = req.headers.get("authorization");

  // if we're on Vercel and:
  //  1. there's no CRON_SECRET env var
  //  2. request doesn't have the correct auth header,
  // then return false
  if (
    process.env.VERCEL === "1" &&
    (!process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return false;
  }
  return true;
};
