"use server";

import { prismaEdge } from "@dub/prisma/edge";
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
    // if the password is valid, set the cookie
    cookies().set(`dub_password_${link.id}`, password, {
      path: `/${link.key}`,
      httpOnly: true,
      secure: true,
    });
    return true;
  } else {
    return { error: "Invalid password" };
  }
}
