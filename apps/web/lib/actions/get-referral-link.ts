"use server";

import { prisma } from "@/lib/prisma";
import { API_DOMAIN } from "@dub/utils";
import { Link } from "dub/dist/commonjs/models/components";

export const getReferralLink = async (slug: string) => {
  const workspace = await prisma.project.findUnique({
    where: {
      slug,
    },
  });
  if (!workspace || !workspace.referralLinkId) {
    return null;
  }
  // return await dub.links.get({
  //   linkId: workspace.referralLinkId,
  // });
  return (await fetch(`${API_DOMAIN}/links/${workspace.referralLinkId}`, {
    headers: {
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())) as Promise<Link>;
};
