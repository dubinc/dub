import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/embed/embed-token";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given link
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const { linkId } = createEmbedTokenSchema.parse(
      await parseRequestBody(req),
    );

    await getLinkOrThrow({ linkId, workspaceId: workspace.id });

    const response = await embedToken.create(linkId);

    return NextResponse.json(EmbedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredAddOn: "conversion",
  },
);
