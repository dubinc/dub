import { ErrorCodes } from "@/lib/api/errors";
import {
  CreatePartnerProps,
  ProcessedLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { defaultPartnerLinkSchema } from "@/lib/zod/schemas/groups";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { isFulfilled, nanoid } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { bulkCreateLinks } from "../links";
import { createLink } from "../links/create-link";
import { processLink } from "../links/process-link";

interface PartnerLinkArgs {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Pick<
    CreatePartnerProps,
    "name" | "email" | "username" | "tenantId" | "linkProps"
  >;
  userId: string;
  partnerId?: string;
  key?: string; // current key to use for the link
  domain?: string;
  url?: string;
}

interface DefaultPartnerLinksInput extends PartnerLinkArgs {
  group: Pick<PartnerGroup, "defaultLinks">;
}

// Create default partner links based on group defaults
export const createDefaultPartnerLinks = async (
  input: DefaultPartnerLinksInput,
) => {
  const defaultLinks = z
    .array(defaultPartnerLinkSchema)
    .parse(input.group.defaultLinks);

  const generatedLinks = (
    await Promise.allSettled(
      defaultLinks.map(({ domain, url }) =>
        generatePartnerLink({
          ...input,
          domain,
          url,
        }),
      ),
    )
  )
    .filter(isFulfilled)
    .map(({ value }) => value);

  const partnerLinks = await bulkCreateLinks({
    links: generatedLinks,
  });

  return partnerLinks;
};

/**
 * Create a partner link
 */
export const createPartnerLink = async (args: PartnerLinkArgs) => {
  const { workspace } = args;

  const link = await generatePartnerLink(args);

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

/**
 * Generates and processes a partner link without creating it
 */
export const generatePartnerLink = async ({
  workspace,
  program,
  partner,
  userId,
  partnerId,
  key,
  domain,
  url,
}: PartnerLinkArgs) => {
  const { name, email, username } = partner;

  let link: ProcessedLinkProps;
  let error: string | null;
  let code: ErrorCodes | null;

  // generate a key for the link
  let currentKey = key;
  if (!currentKey) {
    if (username) {
      currentKey = username;
    } else if (name) {
      currentKey = slugify(name);
    } else {
      currentKey = slugify(email.split("@")[0]);
    }
  }

  while (true) {
    const result = await processLink({
      workspace,
      userId,
      payload: {
        ...partner.linkProps,
        tenantId: partner.tenantId,
        domain,
        key: currentKey,
        url,
        programId: program.id,
        folderId: program.defaultFolderId,
        trackConversion: true,
        partnerId,
      },
    });

    if (
      result.code === "conflict" &&
      result.error.startsWith("Duplicate key")
    ) {
      currentKey = `${currentKey}-${nanoid(4).toLowerCase()}`;
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

  return link;
};
