"use server";

import { shouldApplyRateLimit } from "@/lib/api/environment";
import { getIP } from "@/lib/api/utils/get-ip";
import { prismaEdge } from "@/lib/prisma/edge";
import { ratelimit } from "@/lib/upstash";
import { cookies } from "next/headers";

const IP_ATTEMPTS = 10;
const LINK_ATTEMPTS = 100;
const ATTEMPTS_WINDOW = "10 m";

export async function verifyPassword(_prevState: any, data: FormData) {
  const linkId = data.get("linkId") as string;
  const password = data.get("password") as string;

  const link = await prismaEdge.link.findUnique({
    where: {
      id: linkId,
    },
  });
  if (!link) {
    return { error: "Link not found" };
  }

  const { password: realPassword } = link;

  const validPassword = password === realPassword;

  if (validPassword) {
    (await cookies()).set(`dub_password_${link.id}`, password, {
      path: `/${link.key}`,
      httpOnly: true,
      secure: true,
    });
    return true;
  }

  if (shouldApplyRateLimit) {
    const ipKey = `verify-password:${linkId}:${await getIP()}`;
    const linkKey = `verify-password:${linkId}`;

    const [ipLimit, linkLimit] = await Promise.all([
      ratelimit(IP_ATTEMPTS, ATTEMPTS_WINDOW).getRemaining(ipKey),
      ratelimit(LINK_ATTEMPTS, ATTEMPTS_WINDOW).getRemaining(linkKey),
    ]);

    if (ipLimit.remaining <= 0 || linkLimit.remaining <= 0) {
      return { error: "Don't DDoS me pls 🥺" };
    }

    await Promise.all([
      ratelimit(IP_ATTEMPTS, ATTEMPTS_WINDOW).limit(ipKey),
      ratelimit(LINK_ATTEMPTS, ATTEMPTS_WINDOW).limit(linkKey),
    ]);
  }

  return { error: "Invalid password" };
}
