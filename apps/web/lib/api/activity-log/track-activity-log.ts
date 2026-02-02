import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";

type ResourceType = "referral";

type Action =
  | "referral.created"
  | "referral.updated"
  | "referral.qualified"
  | "referral.unqualified"
  | "referral.closedWon"
  | "referral.closedLost";

interface TrackActivityLogInput
  extends Pick<
    Prisma.ActivityLogUncheckedCreateInput,
    "workspaceId" | "programId" | "resourceId" | "userId" | "description"
  > {
  resourceType: ResourceType;
  action: Action;
  changeSet?: Record<string, unknown>;
}

export const trackActivityLog = async (input: TrackActivityLogInput) => {
  const activityLog = await prisma.activityLog.create({
    data: {
      ...input,
      changeSet: input.changeSet as Prisma.InputJsonValue,
    },
  });

  console.log(
    "[trackActivityLog] Activity log created",
    prettyPrint(activityLog),
  );

  return activityLog;
};
