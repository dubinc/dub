import { getEmbedData } from "../utils";
import { EmbedWidgetPageClient } from "./page-client";

export default async function EmbedWidgetPage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const { link, program, hasPartnerProfile } = await getEmbedData(token);

  return (
    <EmbedWidgetPageClient
      program={program}
      link={link}
      hasPartnerProfile={hasPartnerProfile}
    />
  );
}
