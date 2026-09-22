"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { deleteDiscountAction } from "@/lib/actions/partners/delete-discount";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { useDiscounts } from "@/lib/swr/use-discounts";
import useGroup from "@/lib/swr/use-group";
import { ProgramPartnerLinkExtended } from "@/lib/swr/use-program-partner-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountProps, EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { DiscountSheet } from "@/ui/partners/discounts/add-edit-discount-sheet";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { KeepPartnerInGroupNotice } from "@/ui/partners/keep-partner-in-group-notice";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { AdditionalRewardOptionList } from "@/ui/partners/rewards/additional-reward-option-list";
import { ArrowTurnRight2, Button, Modal } from "@dub/ui";
import { DiscountCode } from "@dub/ui/icons";
import { cn, getPrettyUrl } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type PartnerLink = ProgramPartnerLinkExtended;
type PartnerDiscountOverridePartner = Pick<
  EnrolledPartnerProps,
  "id" | "name" | "email" | "image" | "groupId" | "discountId"
> & {
  groupMoveDisabledAt?: Date | string | null;
};

export type PartnerDiscountOverrideTarget =
  | {
      type: "partner";
      partner: PartnerDiscountOverridePartner;
    }
  | {
      type: "link";
      link: PartnerLink;
      partner: PartnerDiscountOverridePartner;
    };

/** What the target currently inherits or overrides. */
function getEffectiveDiscountId({
  target,
  groupDefaultDiscountId,
}: {
  target: PartnerDiscountOverrideTarget;
  groupDefaultDiscountId: string | null | undefined;
}) {
  if (target.type === "partner") {
    return target.partner.discountId ?? groupDefaultDiscountId ?? null;
  }

  return (
    target.link.discount ??
    target.partner.discountId ??
    groupDefaultDiscountId ??
    null
  );
}

interface EditPartnerDiscountModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  target: PartnerDiscountOverrideTarget;
  group?: GroupProps | null;
}

function EditPartnerDiscountModal({
  showModal,
  setShowModal,
  target,
  group: groupProp,
}: EditPartnerDiscountModalProps) {
  const { partner } = target;

  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(
    null,
  );
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [activeSheet, setActiveSheet] = useState<{
    discount: DiscountProps | null;
  } | null>(null);

  const { id: workspaceId, slug } = useWorkspace();
  const { group: fetchedGroup } = useGroup({
    groupIdOrSlug: partner.groupId ?? undefined,
  });
  const group = groupProp ?? fetchedGroup;
  const { discounts, loading: discountsLoading } = useDiscounts(
    {
      groupId: partner.groupId,
    },
    {
      revalidateOnFocus: true,
    },
  );

  const { makeRequest: updatePartnerLink, isSubmitting: isUpdatingLink } =
    useApiMutation();

  const { executeAsync: updateEnrollment, isPending: isUpdatingEnrollment } =
    useAction(updatePartnerEnrollmentAction, {
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Discount updated");
        await mutatePrefix(["/api/partners", "/api/discounts"]);
      },
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to update discount"));
      },
    });

  const {
    executeAsync: updateEnrollmentSettings,
    isPending: isUpdatingEnrollmentSettings,
  } = useAction(updatePartnerEnrollmentAction);

  const { executeAsync: deleteDiscount, isPending: isDeleting } = useAction(
    deleteDiscountAction,
    {
      onSuccess: async () => {
        toast.success("Discount deleted!");
        await mutatePrefix(["/api/discounts", "/api/partners", "/api/groups"]);
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Failed to delete discount");
      },
    },
  );

  const groupDefaultDiscountId = group?.discount?.id;
  const effectiveDiscountId = getEffectiveDiscountId({
    target,
    groupDefaultDiscountId,
  });
  const hasChanges =
    hasInitializedSelection && selectedDiscountId !== effectiveDiscountId;
  const isSubmitting =
    isUpdatingLink ||
    isUpdatingEnrollment ||
    isUpdatingEnrollmentSettings ||
    isDeleting;

  const sortedDiscounts = useMemo(() => {
    return [...(discounts ?? [])].sort((a, b) => {
      if (a.id === groupDefaultDiscountId) return -1;
      if (b.id === groupDefaultDiscountId) return 1;
      return 0;
    });
  }, [discounts, groupDefaultDiscountId]);

  const options = useMemo(
    () =>
      sortedDiscounts.map((discount) => {
        const isGroup = discount.id === groupDefaultDiscountId;
        const description = formatDiscountDescription(discount);

        return {
          id: discount.id,
          isGroup,
          partnersCount: discount.partnersCount,
          searchValue: isGroup ? `${description} group` : description,
          label: <ProgramRewardDescription discount={discount} />,
        };
      }),
    [sortedDiscounts, groupDefaultDiscountId],
  );

  useEffect(() => {
    if (!showModal) {
      setSelectedDiscountId(null);
      setHasInitializedSelection(false);
      setActiveSheet(null);
      return;
    }

    if (hasInitializedSelection) {
      return;
    }

    if (effectiveDiscountId || !discountsLoading) {
      setSelectedDiscountId(effectiveDiscountId);
      setHasInitializedSelection(true);
    }
  }, [
    showModal,
    hasInitializedSelection,
    effectiveDiscountId,
    discountsLoading,
  ]);

  const openDiscountSheet = useCallback(
    (discount: DiscountProps | null = null) => {
      setActiveSheet({ discount });
    },
    [],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedDiscountId) {
        return;
      }

      if (selectedDiscountId === effectiveDiscountId) {
        setShowModal(false);
        return;
      }

      const groupMoveDisabledAt = partner.groupMoveDisabledAt
        ? undefined
        : new Date();

      if (target.type === "partner") {
        if (!workspaceId) {
          return;
        }

        await updateEnrollment({
          workspaceId,
          partnerId: partner.id,
          discountId: selectedDiscountId,
          ...(groupMoveDisabledAt && { groupMoveDisabledAt }),
        });
        return;
      }

      if (groupMoveDisabledAt && workspaceId) {
        const result = await updateEnrollmentSettings({
          workspaceId,
          partnerId: partner.id,
          groupMoveDisabledAt,
        });

        if (result?.serverError || result?.validationErrors) {
          toast.error(parseActionError(result, "Failed to update discount"));
          return;
        }
      }

      await updatePartnerLink(`/api/partners/links/${target.link.id}`, {
        method: "PATCH",
        body: {
          discountId: selectedDiscountId,
        },
        onSuccess: async () => {
          setShowModal(false);
          toast.success("Discount updated");
          await mutatePrefix(["/api/partners", "/api/partners/links"]);
        },
      });
    },
    [
      selectedDiscountId,
      workspaceId,
      effectiveDiscountId,
      setShowModal,
      updateEnrollment,
      updateEnrollmentSettings,
      updatePartnerLink,
      target,
      partner.id,
      partner.groupMoveDisabledAt,
    ],
  );

  const handleDelete = useCallback(
    async (discountId: string) => {
      if (!workspaceId || discountId === groupDefaultDiscountId) {
        return;
      }

      if (!confirm("Are you sure you want to delete this discount?")) {
        return;
      }

      await deleteDiscount({
        workspaceId,
        discountId,
      });

      if (selectedDiscountId === discountId) {
        setSelectedDiscountId(groupDefaultDiscountId ?? null);
      }
    },
    [workspaceId, deleteDiscount, selectedDiscountId, groupDefaultDiscountId],
  );

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-[540px]"
      preventDefaultClose={activeSheet != null}
    >
      {activeSheet && (
        <DiscountSheet
          key={activeSheet.discount?.id ?? "new"}
          nested
          isOpen
          setIsOpen={(value) => {
            const nextOpen = typeof value === "function" ? value(true) : value;
            if (!nextOpen) {
              setActiveSheet(null);
            }
          }}
          discount={activeSheet.discount ?? undefined}
          isDefault={activeSheet.discount ? undefined : false}
          groupIdOrSlug={partner.groupId}
          onCreated={setSelectedDiscountId}
        />
      )}
      <form onSubmit={onSubmit}>
        <div className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-semibold tracking-tight">
            Edit discount
          </h3>
          <Button
            type="button"
            variant="secondary"
            text="Create discount"
            icon={<DiscountCode className="size-4" />}
            className="h-8 w-fit px-3"
            onClick={() => openDiscountSheet()}
          />
        </div>

        <div className="min-h-[120px] px-4 py-4">
          {discountsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-lg bg-neutral-100"
                />
              ))}
            </div>
          ) : (
            <AdditionalRewardOptionList
              options={options}
              selectedId={selectedDiscountId}
              onSelect={setSelectedDiscountId}
              onEdit={(id) => {
                const discount = sortedDiscounts.find((item) => item.id === id);
                if (discount) {
                  openDiscountSheet(discount);
                }
              }}
              onDelete={group ? handleDelete : undefined}
              searchPlaceholder="Search discounts..."
              emptyLabel={
                options.length === 0
                  ? "No discounts available. Create one to get started."
                  : "No discounts found"
              }
              onCreate={() => openDiscountSheet()}
              createLabel="Create discount"
              showModal={showModal}
            />
          )}
        </div>

        <div className="border-border-subtle flex items-center justify-between gap-4 border-t px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <PartnerAvatar partner={partner} className="size-6 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/${slug}/program/partners/${partner.id}`}
                  target="_blank"
                  className={cn(
                    "min-w-0 cursor-alias truncate text-xs font-medium text-neutral-900 decoration-dotted hover:underline",
                    target.type !== "link" && "text-sm",
                  )}
                >
                  {partner.name}
                </Link>
                <KeepPartnerInGroupNotice offerType="discount" />
              </div>
              {target.type === "link" && (
                <Link
                  href={`/${slug}/links/${getPrettyUrl(target.link.shortLink)}`}
                  target="_blank"
                  className="flex cursor-alias items-center gap-1 truncate text-[11px] text-neutral-500 decoration-dotted hover:underline"
                >
                  <ArrowTurnRight2 className="size-3" />
                  {getPrettyUrl(
                    constructPartnerLink({ group, link: target.link }),
                  )}
                </Link>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Save"
              className="h-8 w-fit px-3"
              loading={isSubmitting}
              disabled={!selectedDiscountId || options.length === 0}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function useEditPartnerDiscountModal({
  target,
  group,
}: {
  target: PartnerDiscountOverrideTarget | null;
  group?: GroupProps | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const propsRef = useRef({ target, group });
  const lastTargetRef = useRef(target);
  propsRef.current = { target, group };
  if (target) {
    lastTargetRef.current = target;
  }

  const EditPartnerDiscountModalCallback = useCallback(() => {
    const { group: currentGroup } = propsRef.current;
    const currentTarget = propsRef.current.target ?? lastTargetRef.current;

    if (!currentTarget) {
      return null;
    }

    return (
      <EditPartnerDiscountModal
        showModal={showModal}
        setShowModal={setShowModal}
        target={currentTarget}
        group={currentGroup}
      />
    );
  }, [showModal]);

  return {
    setShowEditPartnerDiscountModal: setShowModal,
    EditPartnerDiscountModal: EditPartnerDiscountModalCallback,
  };
}
