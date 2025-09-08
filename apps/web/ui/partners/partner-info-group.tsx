import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import Link from "next/link";
import { useChangeGroupModal } from "./change-group-modal";
import { GroupColorCircle } from "./groups/group-color-circle";

export function PartnerInfoGroup({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  const { slug } = useWorkspace();

  const { groups } = useGroups();

  const group = groups?.find((g) => g.id === partner.groupId);

  const { ChangeGroupModal, setShowChangeGroupModal } = useChangeGroupModal({
    partners: [partner],
  });

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-100 p-2 pl-3">
      <ChangeGroupModal />
      <div className="flex min-w-0 items-center gap-2">
        {group ? (
          <GroupColorCircle group={group} />
        ) : (
          <div className="size-3 shrink-0 animate-pulse rounded-full bg-neutral-200" />
        )}
        {group ? (
          <Link
            href={`/${slug}/program/groups/${group.slug}`}
            target="_blank"
            className="min-w-0 cursor-alias truncate text-sm font-medium text-neutral-800 decoration-dotted underline-offset-2 hover:underline"
            title={group.name}
          >
            {group.name}
          </Link>
        ) : (
          <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
      {group ? (
        <Button
          variant="secondary"
          text="Change group"
          className="h-7 w-fit rounded-lg px-2.5"
          onClick={() => setShowChangeGroupModal(true)}
        />
      ) : (
        <div className="h-7 w-24 animate-pulse rounded-lg bg-neutral-200" />
      )}
    </div>
  );
}
