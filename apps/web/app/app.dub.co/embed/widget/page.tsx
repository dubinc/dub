import { getLinkAndProgram } from "../utils";
import { EmbedWidgetPageClient } from "./page-client";

export default async function EmbedWidgetPage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const { link, program } = await getLinkAndProgram(token);

  return <EmbedWidgetPageClient program={program} link={link} />;
}
