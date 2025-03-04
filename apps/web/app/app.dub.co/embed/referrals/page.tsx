import { ReferralsEmbedPageClient } from "./page-client";
import { getReferralsEmbedData } from "./utils";

export default async function ReferralsEmbedPage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const embedData = await getReferralsEmbedData(token);

  return <ReferralsEmbedPageClient {...embedData} />;
}
