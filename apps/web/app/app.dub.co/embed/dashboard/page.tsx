import { getLinkAndProgram } from "../utils";
import { RewardDashboardPageClient } from "./page-client";

export default async function RewardDashboardPage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const { token } = searchParams;

  const { link, program } = await getLinkAndProgram(token);

  return <RewardDashboardPageClient program={program} link={link} />;
}
