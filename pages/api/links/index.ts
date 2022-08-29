import type { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { customAlphabet } from "nanoid";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
    }

    const url = req.nextUrl.searchParams.get("url");
    const hostname = req.nextUrl.searchParams.get("hostname");
    const nanoid = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      7,
    ); // 7-character random string

    // 7 characters might cause some collisions, in case of collisions, we retry up to 10 times.
    for (let i = 0; i < 10; i++) {
      const key = nanoid();
      const response = await redis.hsetnx(`${hostname}:links`, key, url);
      if (response === 1) {
        return new Response(
          JSON.stringify({
            key,
            url,
          }),
          { status: 200 },
        );
      }
      console.warn(`Collission: ${key} for ${url}`);
    }
    throw new Error("failed to save link");
  } catch (err) {
    const { message } = (err as Error);
    console.error("Error: ", message);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      { status: 500 },
    );
  }
}
