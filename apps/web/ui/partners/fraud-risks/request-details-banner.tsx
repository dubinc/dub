"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudGroupProps } from "@/lib/types";
import { Button, Msgs } from "@dub/ui";
import { FraudRuleType } from "@prisma/client";
import Link from "next/link";

export function RequestDetailsBanner({
  fraudGroup,
}: {
  fraudGroup: FraudGroupProps;
}) {
  const { slug, plan } = useWorkspace();
  const { canMessagePartners } = getPlanCapabilities(plan);

  if (
    !canMessagePartners ||
    fraudGroup.type !== FraudRuleType.paidTrafficDetected
  ) {
    return null;
  }

  const { partner } = fraudGroup;

  const message = `Hi ${partner.name},

We noticed paid advertising traffic tied to recent referral activity from your account.

Could you share dashboard screenshots that contain the campaign name, keywords or targeting, and the landing page URL so we can review it?

Thanks!`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-4 py-2.5">
      <p className="text-sm font-medium text-blue-900">
        <span className="font-semibold">Recommended:</span> Request paid traffic
        details from the partner
      </p>
      <Link
        href={`/${slug}/program/messages/${partner.id}?message=${encodeURIComponent(message)}`}
        target="_blank"
      >
        <Button
          variant="primary"
          icon={<Msgs className="size-4" />}
          text="Request details"
          className="h-8 shrink-0 rounded-lg px-3 text-sm"
        />
      </Link>
    </div>
  );
}
