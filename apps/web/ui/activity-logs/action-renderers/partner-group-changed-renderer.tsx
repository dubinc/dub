import useGroups from "@/lib/swr/use-groups";
import { ActivityLog, GroupProps } from "@/lib/types";
import { Bolt } from "@dub/ui";
import { ReactNode } from "react";
import { GroupPill, SourcePill, UserChip } from "../activity-entry-chips";

interface GroupChangeSet {
  old: Pick<GroupProps, "id" | "name">;
  new: Pick<GroupProps, "id" | "name">;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

export function PartnerGroupChangedRenderer({ log }: { log: ActivityLog }) {
  const { groups } = useGroups();

  const groupChange = log.changeSet?.group as GroupChangeSet | undefined;

  if (!groupChange?.new) {
    return <span>Group changed</span>;
  }

  const newGroup = groupChange.new;
  const newGroupColor =
    groups?.find((g) => g.id === newGroup.id)?.color ?? null;

  return (
    <>
      <Label>{groupChange.old ? "Moved to" : "Added to"}</Label>
      <GroupPill name={newGroup.name} color={newGroupColor} />
      {log.user ? (
        <>
          <Label>by</Label>
          <UserChip user={log.user} />
        </>
      ) : groupChange.old ? (
        <>
          <Label>automatically by</Label>
          <SourcePill icon={<Bolt className="size-3" />} label="Group move" />
        </>
      ) : null}
    </>
  );
}
