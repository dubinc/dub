import { getEmbedData } from "./utils";
import { EmbedInlinePageClient } from "./page-client";

export default async function EmbedInlinePage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const embedData = await getEmbedData(token);

  return <EmbedInlinePageClient {...embedData} />;
}
