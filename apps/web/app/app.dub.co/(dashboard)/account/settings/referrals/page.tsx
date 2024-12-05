import { getSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { DubWidget } from "@dub/embed-react";

export default async function ReferralsPage() {
  const session = await getSession();
  const referralLinkId = session?.user["referralLinkId"];

  if (!referralLinkId) return <div>No referral link ID</div>;

  const { publicToken } = await dub.embedTokens.create({
    linkId: referralLinkId,
  });

  if (!publicToken) return <div>No public token</div>;

  return <DubWidget token={publicToken} variant="inline" />;
}
