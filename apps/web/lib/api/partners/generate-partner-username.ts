import { prisma } from "@dub/prisma";
import { nanoid, RESERVED_SLUGS } from "@dub/utils";
import slugify from "@sindresorhus/slugify";

export function derivePartnerUsername({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  let username = "";

  if (name) {
    username = slugify(name);
  } else if (email) {
    username = slugify(email.split("@")[0]);
  } else {
    username = nanoid(8).toLowerCase();
  }

  if (RESERVED_SLUGS.includes(username)) {
    return `${username}-${nanoid(4).toLowerCase()}`;
  }

  return username;
}

export async function generatePartnerUsername({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  let username = derivePartnerUsername({
    name,
    email,
  });

  while (true) {
    const partner = await prisma.partner.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    if (!partner) {
      return username;
    }

    username = `${username}-${nanoid(4).toLowerCase()}`;
  }
}
