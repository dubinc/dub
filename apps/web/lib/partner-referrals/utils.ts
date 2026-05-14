import { PARTNERS_DOMAIN } from "@dub/utils";
import { PartnerProps, ProgramProps } from "../types";

// Construct the program or Dub Network referral link
export const constructPartnerReferralLink = ({
  partner,
  program,
}: {
  partner: Pick<PartnerProps, "username"> | undefined;
  program?: Pick<ProgramProps, "slug">;
}) => {
  const viaQuery = partner?.username ? `?via=${partner.username}` : "";
  const path = program ? `/${program.slug}/apply` : "/register";

  return `${PARTNERS_DOMAIN}${path}${viaQuery}`;
};
