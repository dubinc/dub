import useWorkspaceUsers from "@/lib/swr/use-workspace-users";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { CircleDottedUser } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo } from "react";
import { useAssignPartnersModal } from "../modals/assign-partners-modal";

export function PartnerInfoAssignee({
  partner,
  changeButtonText = "Change",
  hideChangeButton = false,
  className,
  selectedManagerUserId,
  setSelectedManagerUserId,
}: {
  partner: Pick<
    EnrolledPartnerProps,
    "id" | "name" | "image" | "managerUserId"
  > &
    Partial<Pick<EnrolledPartnerProps, "email" | "managerUser">>;
  changeButtonText?: string;
  hideChangeButton?: boolean;
  className?: string;
  selectedManagerUserId?: string | null;
  setSelectedManagerUserId?: (userId: string | null) => void;
}) {
  const { users } = useWorkspaceUsers();

  const effectiveManagerUserId =
    selectedManagerUserId !== undefined
      ? selectedManagerUserId
      : partner.managerUserId;

  const managerUser = useMemo(() => {
    if (!effectiveManagerUserId) return null;

    // First check if the partner already has the managerUser data
    if (
      partner.managerUser &&
      partner.managerUser.id === effectiveManagerUserId
    ) {
      return partner.managerUser;
    }

    // Otherwise look up from workspace users
    const user = users?.find((u) => u.id === effectiveManagerUserId);
    if (user) {
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    }

    // If not found in workspace users, it might be the persisted managerUser (removed member)
    if (partner.managerUser) {
      return partner.managerUser;
    }

    return null;
  }, [effectiveManagerUserId, partner.managerUser, users]);

  const isRemovedMember = useMemo(() => {
    if (!managerUser || !users) return false;
    return !users.some((u) => u.id === managerUser.id);
  }, [managerUser, users]);

  const { AssignPartnersModal, setShowAssignPartnersModal } =
    useAssignPartnersModal({
      partners: [
        {
          ...partner,
          managerUserId: effectiveManagerUserId ?? null,
        },
      ],
      onAssign: setSelectedManagerUserId
        ? (managerUserId) => {
            setSelectedManagerUserId(managerUserId);
            return false;
          }
        : undefined,
    });

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-100 p-2 pl-3",
        className,
      )}
    >
      <AssignPartnersModal />
      <div className="flex min-w-0 items-center gap-2">
        {managerUser ? (
          <img
            src={
              managerUser.image ||
              `${OG_AVATAR_URL}${managerUser.name || managerUser.id}`
            }
            alt={managerUser.name || ""}
            className={cn(
              "size-5 shrink-0 rounded-full",
              isRemovedMember && "grayscale",
            )}
          />
        ) : (
          <CircleDottedUser className="size-5 shrink-0 text-neutral-400" />
        )}
        {managerUser ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {isRemovedMember && (
              <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                Removed
              </span>
            )}
            <span className="min-w-0 truncate text-sm font-medium text-neutral-800">
              {managerUser.name || ("email" in managerUser && managerUser.email) || "Unknown"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-neutral-400">No assignee</span>
        )}
      </div>
      {hideChangeButton ? null : (
        <Button
          variant="secondary"
          text={changeButtonText}
          className="h-7 w-fit rounded-lg px-2.5"
          onClick={() => setShowAssignPartnersModal(true)}
        />
      )}
    </div>
  );
}
