import { getReferralLink } from "@/lib/actions/get-referral-link";
import WorkspaceSettingsClient from "./page-client";

export default async function WorkspaceSettings({
  params,
}: {
  params: { slug: string };
}) {
  const referralLink = await getReferralLink(params.slug);

  return <WorkspaceSettingsClient hasReferralLink={referralLink != null} />;
}
