"use server";

import { shouldApplyRateLimit } from "@/lib/api/environment";
import { prismaEdge } from "@/lib/prisma/edge";
import { ratelimit } from "@/lib/upstash";
import { cookies } from "next/headers";

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
    const { success } = await ratelimit(30, "10 m").limit(
      `verify-password:${linkId}`,
    );

    if (!success) {
      return { error: "Don't DDoS me pls 🥺" };
    }
  }

  return { error: "Invalid password" };
}
