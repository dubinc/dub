import { logger } from "@/lib/axiom/server";
import {
  ActivityLogAction,
  ActivityLogResourceType,
  ChangeSet,
} from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";

const ACTIONS_WITHOUT_CHANGE_SET: ActivityLogAction[] = [
  "referral.created",
  "reward.created",
  "reward.deleted",
];

export interface TrackActivityLogInput
  extends Pick<
    Prisma.ActivityLogUncheckedCreateInput,
    | "workspaceId"
    | "programId"
    | "resourceId"
    | "userId"
    | "description"
    | "parentResourceType"
    | "parentResourceId"
    | "batchId"
  > {
  resourceType: ActivityLogResourceType;
  action: ActivityLogAction;
  changeSet?: ChangeSet;
}

export const trackActivityLog = async (
  input: TrackActivityLogInput | TrackActivityLogInput[],
) => {
  let inputs = Array.isArray(input) ? input : [input];

  inputs = inputs.filter(
    (i) =>
      ACTIONS_WITHOUT_CHANGE_SET.includes(i.action) ||
      (i.changeSet && Object.keys(i.changeSet).length > 0),
  );

  if (inputs.length === 0) {
    return;
  }

  try {
    const createdActivityLogs = await prisma.activityLog.createMany({
      data: inputs.map((input) => ({
        ...input,
        changeSet: input.changeSet as Prisma.InputJsonValue,
      })),
    });

    console.log(
      `[trackActivityLog] Created ${createdActivityLogs.count} activity logs`,
      prettyPrint(inputs),
    );
  } catch (error) {
    logger.error("[trackActivityLog] Failed to create activity log", error);
    await logger.flush();
  }
};
