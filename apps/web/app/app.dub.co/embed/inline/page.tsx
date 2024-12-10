import { getEmbedData } from "../utils";
import { EmbedInlinePageClient } from "./page-client";

export default async function EmbedInlinePage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  const { token } = await searchParams;

  const { link, program, hasPartnerProfile, earnings } =
    await getEmbedData(token);

  return (
    <EmbedInlinePageClient
      program={program}
      link={link}
      earnings={earnings}
      hasPartnerProfile={hasPartnerProfile}
    />
  );
}
