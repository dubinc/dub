import { ReferralsEmbedPageClient } from "./page-client";
import { getEmbedData } from "./utils";

export default async function ReferralsEmbedPage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const embedData = await getEmbedData(token);

  return <ReferralsEmbedPageClient {...embedData} />;
}
