"use server";
import prisma from "#/lib/prisma";

export async function verifyPassword(data: FormData) {
  const domain = data.get("domain") as string;
  const rawKey = data.get("key") as string; // keys can potentially be encoded
  const key = decodeURIComponent(rawKey);
  const password = data.get("password") as string;

  const link = await prisma.link.findUnique({
    where: { domain_key: { domain, key } },
    select: { url: true, password: true },
  });
  if (!link) {
    return { error: "Link not found" };
  }
  const { url, password: realPassword } = link;

  const validPassword = password === realPassword;

  if (validPassword) {
    return { url };
  } else {
    return { error: "Invalid password" };
  }
}
