"use server";

import { getLinkViaEdge } from "@/lib/planetscale";
import { redirect } from "next/navigation";

export async function verifyPassword(_prevState: any, data: FormData) {
  const domain = data.get("domain") as string;
  const rawKey = data.get("key") as string; // keys can potentially be encoded
  const key = decodeURIComponent(rawKey);
  const password = data.get("password") as string;

  const link = await getLinkViaEdge(domain, key);
  if (!link) {
    return { error: "Link not found" };
  }
  const { password: realPassword } = link;

  const validPassword = password === realPassword;

  if (validPassword) {
    // if the password is valid, redirect to the link with the password in the query string
    await redirectHelper(domain, key, password);
  } else {
    return { error: "Invalid password" };
  }
}

async function redirectHelper(domain: string, key: string, password: string) {
  redirect(`https://${domain}/${key}?pw=${password}`);
}
