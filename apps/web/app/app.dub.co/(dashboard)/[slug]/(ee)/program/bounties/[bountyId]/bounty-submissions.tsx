"use client";

import useBounty from "@/lib/swr/use-bounty";
import { useParams } from "next/navigation";

export function BountySubmissions() {
  const { bountyId } = useParams<{ bountyId: string }>();
  const {  bounty } = useBounty({ bountyId });

  return <div></div>;
}
