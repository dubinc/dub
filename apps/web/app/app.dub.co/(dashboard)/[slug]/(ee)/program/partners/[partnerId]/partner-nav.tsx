"use client";

import { usePartnerCommentsCount } from "@/lib/swr/use-partner-comments-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import {
  Hyperlink,
  InvoiceDollar,
  LinesY,
  MoneyBills2,
  Msg,
  User,
} from "@dub/ui";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";

export function PartnerNav() {
  const pathname = usePathname();
  const { partnerId } = useParams() as { partnerId: string };
  const { slug: workspaceSlug } = useWorkspace();

  const { count: commentsCount } = usePartnerCommentsCount(
    {
      partnerId,
    },
    {
      keepPreviousData: true,
    },
  );

  const tabs = useMemo(
    () => [
      {
        id: "links",
        label: "Links",
        icon: Hyperlink,
      },
      {
        id: "payouts",
        label: "Payouts",
        icon: MoneyBills2,
      },
      {
        id: "about",
        label: "About",
        icon: User,
      },
      {
        id: "comments",
        label: "Comments",
        badge: commentsCount
          ? commentsCount > 99
            ? "99+"
            : commentsCount
          : undefined,
        icon: Msg,
      },
    ],
    [commentsCount],
  );

  const quickLinks = useMemo(
    () => [
      {
        id: "analytics",
        label: "Analytics",
        icon: LinesY,
        href: `/${workspaceSlug}/program/analytics?partnerId=${partnerId}`,
      },
      {
        id: "commissions",
        label: "Commissions",
        icon: InvoiceDollar,
        href: `/${workspaceSlug}/program/commissions?partnerId=${partnerId}`,
      },
    ],
    [workspaceSlug, partnerId],
  );

  return (
    <PageNavTabs
      basePath={`/${workspaceSlug}/program/partners/${partnerId}`}
      tabs={tabs}
      quickLinks={quickLinks}
    />
  );
}
