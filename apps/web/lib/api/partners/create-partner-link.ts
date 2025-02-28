import { ErrorCodes } from "@/lib/api/errors";
import { ProcessedLinkProps, ProgramProps, WorkspaceProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { createPartnerSchema } from "@/lib/zod/schemas/partners";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { createLink } from "../links/create-link";
import { processLink } from "../links/process-link";

// createing partner link
export const createPartnerLink = async ({
  workspace,
  program,
  partner,
  userId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "defaultFolderId" | "domain" | "url">;
  partner: z.infer<typeof createPartnerSchema>;
  userId: string;
}) => {
  if (!program.domain || !program.url) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You need to set a domain and url for this program before creating a partner.",
    });
  }

  const { tenantId, linkProps, username, programId } = partner;

  let link: ProcessedLinkProps;
  let error: string | null;
  let code: ErrorCodes | null;
  let currentKey = username ?? nanoid();

  while (true) {
    const result = await processLink({
      workspace,
      userId,
      payload: {
        ...linkProps,
        domain: program.domain,
        key: currentKey,
        url: program.url,
        programId,
        tenantId,
        folderId: program.defaultFolderId,
        trackConversion: true,
      },
    });

    if (
      result.code === "conflict" &&
      result.error.startsWith("Duplicate key")
    ) {
      currentKey = username + nanoid(4).toLowerCase();
      continue;
    }

    // if we get here, either there was a different error or it succeeded
    link = result.link as ProcessedLinkProps;
    error = result.error;
    code = result.code as ErrorCodes;
    break;
  }

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const partnerLink = await createLink(link);

  waitUntil(
    sendWorkspaceWebhook({
      trigger: "link.created",
      workspace,
      data: linkEventSchema.parse(partnerLink),
    }),
  );

  return partnerLink;
};
