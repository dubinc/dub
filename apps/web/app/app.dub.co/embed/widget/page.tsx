import { getLinkAndProgram } from "../utils";
import { EmbedWidgetPageClient } from "./page-client";

export default async function EmbedWidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  const { token } = await searchParams;

  const { link, program, earnings } = await getLinkAndProgram(token);

  return (
    <EmbedWidgetPageClient program={program} link={link} earnings={earnings} />
  );
}
