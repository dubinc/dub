import { getEmbedData } from "../utils";
import { EmbedInlinePageClient } from "./page-client";

export default async function EmbedInlinePage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const { link, program, discount, payouts } = await getEmbedData(token);

  return (
    <EmbedInlinePageClient
      program={program}
      link={link}
      discount={discount}
      payouts={payouts}
    />
  );
}
