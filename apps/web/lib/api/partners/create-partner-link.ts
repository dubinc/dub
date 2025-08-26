import { ErrorCodes } from "@/lib/api/errors";
import {
  CreatePartnerProps,
  ProcessedLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { createLink } from "../links/create-link";
import { processLink } from "../links/process-link";

interface CreatePartnerLinkInput {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Omit<CreatePartnerProps, "linkProps"> & { id?: string };
  link: CreatePartnerProps["linkProps"] & {
    domain: string;
    url: string;
    key?: string;
  };
  userId: string;
}

interface GeneratePartnerLinkInput extends CreatePartnerLinkInput {}

// Create a partner link
export const createPartnerLink = async (input: CreatePartnerLinkInput) => {
  const { workspace } = input;

  const link = await generatePartnerLink(input);
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

// Generates and processes a partner link without creating it
export const generatePartnerLink = async ({
  workspace,
  program,
  partner,
  link,
  userId,
}: GeneratePartnerLinkInput) => {
  const { name, email, username } = partner;

  let processedLink: ProcessedLinkProps;
  let error: string | null;
  let code: ErrorCodes | null;

  // generate a key for the link
  let currentKey = derivePartnerLinkKey({
    key: link.key,
    username,
    name,
    email,
  });

  while (true) {
    const result = await processLink({
      workspace,
      userId,
      payload: {
        ...link,
        key: currentKey,
        trackConversion: true,
        programId: program.id,
        folderId: program.defaultFolderId,
        partnerId: partner.id,
        tenantId: partner.tenantId,
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
    processedLink = result.link as ProcessedLinkProps;
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

  return processedLink;
};

export function derivePartnerLinkKey({
  key,
  username,
  name,
  email,
}: {
  key?: string;
  username?: string | null;
  name?: string | null;
  email: string;
}) {
  if (key) {
    return key;
  }

  if (username) {
    return username;
  }

  if (name) {
    return slugify(name);
  }

  return slugify(email.split("@")[0]);
}
