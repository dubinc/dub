import { ErrorCodes } from "@/lib/api/errors";
import {
  CreatePartnerProps,
  ProcessedLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { DubApiError } from "../errors";
import { processLink } from "../links/process-link";

interface GeneratePartnerLinkInput {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Omit<CreatePartnerProps, "linkProps"> & { id?: string };
  link: CreatePartnerProps["linkProps"] & {
    domain: string;
    url: string;
    key?: string;
    partnerGroupDefaultLinkId?: string | null;
  };
  userId: string;
}

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
    const result = await processLink<{
      partnerGroupDefaultLinkId?: string | null;
    }>({
      workspace: {
        id: workspace.id,
        plan: workspace.plan,
        users: [{ role: "owner" }], // TODO: apply folders RBAC to generatePartnerLink checks
      },
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
    console.error("Error generating partner link", error);

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
