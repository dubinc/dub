import { PartnerGroup } from "@dub/prisma/client";

export type FieldDiff<T = unknown> = {
  old: T | null;
  new: T | null;
};

export type ChangeSet = Record<string, FieldDiff>;

interface BuildProgramEnrollmentChangeSetInput {
  oldEnrollment:
    | { partnerGroup: Pick<PartnerGroup, "id" | "name"> | null | undefined }
    | null
    | undefined;
  newEnrollment:
    | { partnerGroup: Pick<PartnerGroup, "id" | "name"> | null | undefined }
    | null
    | undefined;
}

export const buildProgramEnrollmentChangeSet = ({
  oldEnrollment,
  newEnrollment,
}: BuildProgramEnrollmentChangeSetInput): ChangeSet => {
  const changeSet: ChangeSet = {};

  const oldGroup = oldEnrollment?.partnerGroup;
  const newGroup = newEnrollment?.partnerGroup;

  if (oldGroup?.id !== newGroup?.id) {
    changeSet.group = {
      old: oldGroup ? { id: oldGroup.id, name: oldGroup.name } : null,
      new: newGroup ? { id: newGroup.id, name: newGroup.name } : null,
    };
  }

  return changeSet;
};
