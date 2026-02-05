import useGroups from "@/lib/swr/use-groups";
import { ActivityLog, GroupProps } from "@/lib/types";
import { Bolt } from "@dub/ui";
import { GroupPill, SourcePill, UserChip } from "../activity-entry-chips";

interface GroupChangeSet {
  old: Pick<GroupProps, "id" | "name">;
  new: Pick<GroupProps, "id" | "name">;
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

  if (log.user) {
    return (
      <>
        <span>Moved to</span>
        <GroupPill name={newGroup.name} color={newGroupColor} />
        <span>by</span>
        <UserChip user={log.user} />
      </>
    );
  }

  return (
    <>
      <span>Moved to</span>
      <GroupPill name={newGroup.name} color={newGroupColor} />
      <span>automatically by</span>
      <SourcePill icon={<Bolt className="size-3" />} label="Group move" />
    </>
  );
}
