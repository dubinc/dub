"use server";

// we are not using this yet because it's not possible
// to use next-auth signIn in a server action yet
// will revisit this when that's possible

import { isWhitelistedEmail } from "@/lib/edge-config";
import { conn } from "@/lib/planetscale";

export async function accountExists(data: FormData) {
  const email = data.get("email") as string | undefined;

  if (!email) {
    return {
      error: "Missing email",
    };
  }
  if (!process.env.DATABASE_URL) {
    return {
      error: "Database connection not established",
    };
  }

  const user = await conn
    .execute("SELECT email FROM User WHERE email = ?", [email])
    .then((res) => res.rows[0]);

  if (user) {
    return {
      exists: true,
    };
  }

  const whitelisted = await isWhitelistedEmail(email);
  if (whitelisted) {
    return {
      exists: true,
    };
  }

  return {
    exists: false,
  };
}
