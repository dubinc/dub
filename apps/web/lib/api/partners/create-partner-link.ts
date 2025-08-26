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

// TODO:
// Simplify the interface

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

interface GeneratePartnerLinkInput {
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

interface CreateDefaultPartnerLinksInput {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Pick<CreatePartnerProps, "name" | "email" | "username" | "tenantId"> & { id?: string };
  link?: CreatePartnerProps["linkProps"];
  userId: string;
  group: Pick<PartnerGroup, "id" | "defaultLinks">;
}

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
  let currentKey = link.key;
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

// Create default partner links based on group defaults
export const createDefaultPartnerLinks = async ({
  workspace,
  program,
  partner,
  group,
  link,
  userId,
}: CreateDefaultPartnerLinksInput) => {
  const result = z
    .array(defaultPartnerLinkSchema)
    .safeParse(group.defaultLinks);

  if (!result.success) {
    throw new DubApiError({
      code: "bad_request",
      message: `Invalid defaultLinks settings for the group ${group.id}.`,
    });
  }

  const defaultLinks = result.data;
  const hasMoreThanOneLink = defaultLinks.length > 1;

  const processedLinks = (
    await Promise.allSettled(
      defaultLinks.map(({ domain, url }) => {
        let key = deriveKey({
          username: partner.username,
          name: partner.name,
          email: partner.email,
        });

        key = !hasMoreThanOneLink ? key : `${key}-${nanoid(4).toLowerCase()}`;

        return generatePartnerLink({
          workspace,
          program,
          partner,
          link: {
            ...link,
            domain,
            url,
            key,
          },
          userId,
        });
      }),
    )
  )
    .filter(isFulfilled)
    .map(({ value }) => value);

  return await bulkCreateLinks({
    links: processedLinks,
  });
};

const deriveKey = ({
  key,
  username,
  name,
  email,
}: {
  key?: string;
  username?: string | null;
  name?: string | null;
  email: string;
}) => {
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
};
