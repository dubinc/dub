import { getSession } from "@/lib/auth/utils";
import { dub } from "@/lib/dub";
import { ReferButton } from "./refer-button";

export async function ReferButtonRSC() {
  const session = await getSession();
  const referralLinkId = session?.user["referralLinkId"];

  if (!referralLinkId) return null;

  const { publicToken } = await dub.embedTokens.create({
    linkId: referralLinkId,
  });

  if (!publicToken) return null;

  return <ReferButton publicToken={publicToken} />;
}
