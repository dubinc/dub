import { EventType } from "@/lib/analytics/types";
import ReferralsPageClient from "./page-client";

export default function ReferralsPage({
  searchParams,
}: {
  searchParams: { event?: EventType; page?: string };
}) {
  const { event, page } = searchParams;

  return (
    <>
      <ReferralsPageClient event={event} page={page} />
    </>
  );
}
