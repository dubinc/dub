import { EventType } from "@/lib/analytics/types";
import { Referrals } from "./referrals";

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: { token: string; event?: EventType; page?: string };
}) {
  const { token, event, page } = searchParams;

  return (
    <>
      <Referrals event={event} page={page} publicToken={token} />
    </>
  );
}
