import { prisma } from "@dub/prisma";
import { APP_HOSTNAMES } from "@dub/utils";
import { headers } from "next/headers";
import { isGenericEmail } from "../../is-generic-email";

// Checks if SAML SSO is enforced for a given email domain
export const isSamlEnforcedForEmailDomain = async (email: string) => {
  const hostname = (await headers()).get("host");
  const emailDomain = email.split("@")[1].toLocaleLowerCase();

  if (
    !hostname ||
    !emailDomain ||
    !APP_HOSTNAMES.has(hostname) ||
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
