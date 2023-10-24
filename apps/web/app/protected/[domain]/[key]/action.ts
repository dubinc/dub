"use server";
import prisma from "@/lib/prisma";
import { linkConstructor } from "@dub/utils";
import { redirect } from "next/navigation";

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
  const { password: realPassword } = link;

  const validPassword = password === realPassword;

  if (validPassword) {
    // if the password is valid, redirect to the link with the password in the query string
    redirect(
      `${linkConstructor({
        domain,
        key: rawKey,
      })}?pw=${password}`,
    );
  } else {
    return { error: "Invalid password" };
  }
}
