import { getSession } from "@/lib/auth/utils";
import { dub } from "@/lib/dub";
import { Suspense } from "react";
import { ReferButton } from "./refer-button";

export function ReferButtonRSC() {
  return (
    <Suspense>
      <ReferButtonRSCInner />
    </Suspense>
  );
}

async function ReferButtonRSCInner() {
  const session = await getSession();
  const referralLinkId = session?.user.referralLinkId;

  if (!referralLinkId) return null;

  const { publicToken } = await dub.embedTokens.create({
    linkId: referralLinkId,
  });

  if (!publicToken) return null;

  return <ReferButton publicToken={publicToken} />;
}
