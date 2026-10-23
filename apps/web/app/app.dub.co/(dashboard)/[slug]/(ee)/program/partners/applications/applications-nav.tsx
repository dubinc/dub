"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CircleCheck, CircleHalfDottedClock, UserXmark } from "@dub/ui/icons";
import { ProgramApplicationStatus } from "@prisma/client";

export function ApplicationsNav() {
  const { slug } = useWorkspace();
  const basePath = `/${slug}/program/partners/applications`;

  return (
    <PageNavTabs
      basePath={basePath}
      tabs={[
        {
          id: ProgramApplicationStatus.pending,
          label: "Pending",
          icon: CircleHalfDottedClock,
          href: basePath,
        },
        {
          id: ProgramApplicationStatus.approved,
          label: "Approved",
          icon: CircleCheck,
        },
        {
          id: ProgramApplicationStatus.rejected,
          label: "Rejected",
          icon: UserXmark,
        },
      ]}
      preservedQueryParams={[
        "search",
        "country",
        "groupId",
        "sortBy",
        "sortOrder",
      ]}
    />
  );
}
