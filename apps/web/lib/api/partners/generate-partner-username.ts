import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";

const MAX_RETRIES = 3;

export async function generatePartnerUsername({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const slugifiedBase = name ? slugify(name) : slugify(email.split("@")[0]);
  let username = `${slugifiedBase}-${nanoid(4).toLowerCase()}`;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
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

    if (retries === MAX_RETRIES) {
      return null;
    }

    username = `${slugifiedBase}-${nanoid(4).toLowerCase()}`;
    retries++;
  }
}
