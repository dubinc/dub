import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";
import { isValidDomain } from "./is-valid-domain";

export const validateDomain = async (
  domain: string,
): Promise<{ error: string | null; code?: DubApiError["code"] }> => {
  if (!domain || typeof domain !== "string") {
    return { error: "Missing domain", code: "unprocessable_entity" };
  }
  if (!isValidDomain(domain)) {
    return { error: "Invalid domain", code: "unprocessable_entity" };
  }
  const exists = await domainExists(domain);
  if (exists) {
    return { error: "Domain is already in use.", code: "conflict" };
  }
  return { error: null };
};

export const domainExists = async (domain: string) => {
  const response = await prisma.domain.findFirst({
    where: {
      slug: domain,
    },
    select: {
      slug: true,
    },
  });
  return !!response;
};

export interface CustomResponse extends Response {
  json: () => Promise<any>;
  error?: { code: string; projectId: string; message: string };
}

// special case for domains that use a reverse proxy in front of Dub (not recommended)
export const isProxiedDomain = (domain: string) => {
  return ["go.zillow.com"].includes(domain);
};
