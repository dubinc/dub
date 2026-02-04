import {
  ActivityLogAction,
  ActivityLogResourceType,
} from "@/lib/zod/schemas/activity-log";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";
import { ChangeSet } from "./build-change-set";

interface TrackActivityLogInput
  extends Pick<
    Prisma.ActivityLogUncheckedCreateInput,
    "workspaceId" | "programId" | "resourceId" | "userId" | "description"
  > {
  resourceType: ActivityLogResourceType;
  action: ActivityLogAction;
  changeSet?: ChangeSet;
}

export const trackActivityLog = async (
  input: TrackActivityLogInput | TrackActivityLogInput[],
) => {
  const inputs = (Array.isArray(input) ? input : [input]).filter(
    (i) => !i.changeSet || Object.keys(i.changeSet).length > 0,
  );

  if (inputs.length === 0) {
    return;
  }

  await prisma.activityLog.createMany({
    data: inputs.map((input) => ({
      ...input,
      changeSet: input.changeSet as Prisma.InputJsonValue,
    })),
  });

  console.log("[trackActivityLog] Activity log created", prettyPrint(inputs));
};
