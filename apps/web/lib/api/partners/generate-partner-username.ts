import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";

export async function generatePartnerUsername({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const slugifiedBase = name ? slugify(name) : slugify(email.split("@")[0]);
  let username = `${slugifiedBase}-${nanoid(4).toLowerCase()}`;
  const maxRetries = 3;
  let retries = 0;

  while (retries <= maxRetries) {
    const existingPartner = await prisma.partner.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    if (!existingPartner) {
      return username;
    }

    if (retries === maxRetries) {
      return null;
    }

    username = `${slugifiedBase}-${nanoid(4).toLowerCase()}`;
    retries++;
  }
}
