"use server";

import { linkConstructor } from "@dub/utils";
import { z } from "zod";
import { dub } from "../dub";
import { authActionClient } from "./safe-action";

// Generate a new client secret for an integration
export const generateReferralLink = authActionClient
  .schema(
    z.object({
      workspaceId: z.string(),
    }),
  )
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    try {
      const createdLink = await dub.links.create({
        domain: "refer.dub.co",
        key: workspace.slug,
        url: "https://dub.co",
        externalId: `ws_${workspace.id}`,
        tagIds: ["cm000srqx0004o6ldehod07zc"],
        trackConversion: true,
      });

      return {
        url: linkConstructor({
          domain: createdLink.domain,
          key: createdLink.key,
        }),
      };
    } catch (e) {
      console.error("Failed to generate referral link.", e);
    }

    throw new Error("Failed to generate referral link.");
  });
