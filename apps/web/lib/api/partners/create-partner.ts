import { createId } from "@/lib/api/utils";
import { CreatePartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const createPartner = async ({
  name,
  email,
  country,
  image,
  description,
}: Pick<
  CreatePartnerProps,
  "name" | "email" | "country" | "image" | "description"
>) => {
  if (!email) {
    throw new DubApiError({
      message: "Must provide an email address.",
      code: "bad_request",
    });
  }

  const partner = await prisma.partner.upsert({
    where: {
      email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      email,
      name,
      country: country ?? "US",
      image,
      description,
    },
    update: {},
  });

  return partner;
};
