"use server";

import { linkConstructor } from "@dub/utils";
import { Link } from "dub/dist/commonjs/models/components";
import { z } from "zod";
import { prisma } from "../prisma";
import { authActionClient } from "./safe-action";

// Generate a referral link for a workspace
export const generateReferralLink = authActionClient
  .schema(
    z.object({
      workspaceId: z.string(),
    }),
  )
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    try {
      // const createdLink = await dub.links.create({
      //   domain: "refer.dub.co",
      //   key: workspace.slug,
      //   url: "https://dub.co",
      //   externalId: `ws_${workspace.id}`,
      //   tagIds: ["cm000srqx0004o6ldehod07zc"],
      //   trackConversion: true,
      // });
      const createdLink = (await fetch(`https://api.dub.co/links`, {
        method: "POST",
        body: JSON.stringify({
          domain: "refer.dub.co",
          key: workspace.slug,
          url: "https://dub.co",
          externalId: `ws_${workspace.id}`,
          tagIds: ["cm000srqx0004o6ldehod07zc"],
          trackConversion: true,
        }),
        headers: {
          Authorization: `Bearer ${process.env.DUB_API_KEY}`,
          "Content-Type": "application/json",
        },
      }).then((res) => res.json())) as Link;

      await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          referralLinkId: createdLink.id,
        },
      });

      return {
        url: linkConstructor({
          domain: createdLink.domain,
          key: createdLink.key,
        }),
      };
    } catch (e) {
      console.error("Failed to activate referral link.", e);
    }

    throw new Error("Failed to activate referral link.");
  });
