import { prisma } from "@/lib/prisma";
import { validDomainRegex } from "@dub/utils";
import { DubApiError } from "../errors";

export const validateDomain = async (
  domain: string,
): Promise<{ error: string | null; code?: DubApiError["code"] }> => {
  if (!domain || typeof domain !== "string") {
    return { error: "Missing domain", code: "unprocessable_entity" };
  }
  const validDomain =
    validDomainRegex.test(domain) &&
    // make sure the domain doesn't contain dub.co/dub.sh/d.to
    !/^(dub\.co|.*\.dub\.co|dub\.sh|.*\.dub\.sh|d\.to|.*\.d\.to)$/i.test(
      domain,
    );

  if (!validDomain) {
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
