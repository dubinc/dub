"use server";

import { getRegisteredDotlinkDomain } from "../api/domains/get-registered-dotlink-domain";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

// check if a workspace has claimed their free .link domain
export const checkDotlinkClaimed = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    const registeredDotLinkDomain = await getRegisteredDotlinkDomain(
      workspace.id,
    );

    return registeredDotLinkDomain ? true : false;
  });
