import { prisma } from "@/lib/prisma";
import { isAppHostname } from "@dub/utils";
import { headers } from "next/headers";
import { isGenericEmail } from "../../email/is-generic-email";

// Checks if SAML SSO is enforced for a given email domain
export const isSamlEnforcedForEmailDomain = async (email: string) => {
  const hostname = (await headers()).get("host");
  const emailDomain = email.split("@")[1].toLocaleLowerCase();

  if (
    !hostname ||
    !emailDomain ||
    !isAppHostname(hostname) ||
    isGenericEmail(email)
  ) {
    return false;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      ssoEmailDomain: emailDomain,
    },
    select: {
      ssoEnforcedAt: true,
    },
  });

  if (workspace?.ssoEnforcedAt) {
    return true;
  }

  return false;
};
