import { EnrolledPartnerProps, PartnerProps } from "../types";
import { getDiscoverabilityRequirements } from "./get-discoverability-requirements";
import { getMarketplaceRequirements } from "./get-marketplace-requirements";

export type UnlockTask = {
  label: string;
  href?: string;
  completed: boolean;
};

export type UnlockCategory = {
  title: string;
  description: string;
  tasks: UnlockTask[];
  action?: {
    label: string;
    href: string;
  };
};

export function getUnlocksRequirements({
  partner,
  programEnrollments,
}: {
  partner: Pick<
    PartnerProps,
    | "name"
    | "country"
    | "profileType"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "industryInterests"
    | "platforms"
  >;
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[];
}): {
  categories: UnlockCategory[];
  totalTasks: number;
  completedTasks: number;
} {
  const discoveryTasks = getDiscoverabilityRequirements({
    partner,
    programEnrollments,
  });

  const marketplaceTasks = getMarketplaceRequirements({ partner });

  const categories: UnlockCategory[] = [
    {
      title: "Get discovered",
      description:
        "Appear in the Dub Partner Network and get invited to more programs.",
      tasks: discoveryTasks,
    },
    {
      title: "Access Dub Marketplace",
      description: "Discover more programs to apply to on the Dub Program Network.",
      tasks: marketplaceTasks,
      action: {
        label: "View marketplace",
        href: "/programs/marketplace",
      },
    },
  ];

  const allTasks = [...discoveryTasks, ...marketplaceTasks];

  return {
    categories,
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter((t) => t.completed).length,
  };
}
