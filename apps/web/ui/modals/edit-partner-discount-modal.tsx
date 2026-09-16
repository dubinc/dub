"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { deleteDiscountAction } from "@/lib/actions/partners/delete-discount";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { useDiscounts } from "@/lib/swr/use-discounts";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountProps, EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { DiscountSheet } from "@/ui/partners/discounts/add-edit-discount-sheet";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { AdditionalRewardOptionList } from "@/ui/partners/rewards/additional-reward-option-list";
import { Button, Modal } from "@dub/ui";
import { Discount } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];
type PartnerDiscountOverridePartner = Pick<
  EnrolledPartnerProps,
  "id" | "name" | "email" | "image" | "groupId" | "discountId"
>;

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

function getSelectedDiscountId({
  target,
  groupDiscountId,
}: {
  target: PartnerDiscountOverrideTarget;
  groupDiscountId: string | null | undefined;
}) {
  if (target.type === "partner") {
    return target.partner.discountId ?? groupDiscountId ?? null;
  }

  return (
    target.link.discount ?? target.partner.discountId ?? groupDiscountId ?? null
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

  const { id: workspaceId } = useWorkspace();
  const { group: fetchedGroup } = useGroup({ groupIdOrSlug: partner.groupId });

  const { makeRequest: updatePartnerLink, isSubmitting: isUpdatingLink } =
    useApiMutation();

  const { discounts, loading: discountsLoading } = useDiscounts({
    groupId: partner.groupId,
    swrOpts: {
      revalidateOnFocus: true,
    },
  });

  const group = groupProp ?? fetchedGroup;
  const groupDiscountId = group?.discount?.id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discountSheet, setDiscountSheet] = useState<{
    discount: DiscountProps | null;
  } | null>(null);
  const [isDiscountSheetOpen, setIsDiscountSheetOpen] = useState(false);

  const sortedDiscounts = useMemo(() => {
    return [...(discounts ?? [])].sort((a, b) => {
      if (a.id === groupDiscountId) return -1;
      if (b.id === groupDiscountId) return 1;
      return 0;
    });
  }, [discounts, groupDiscountId]);

  const resolvedSelectedId =
    selectedId ??
    getSelectedDiscountId({
      target,
      groupDiscountId,
    });

  useEffect(() => {
    if (showModal) {
      return;
    }

    setIsDiscountSheetOpen(false);
    setDiscountSheet(null);
    setSelectedId(null);
  }, [showModal]);

  const { executeAsync: updateEnrollment, isPending: isUpdatingEnrollment } =
    useAction(updatePartnerEnrollmentAction, {
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Discount updated");
        await mutatePrefix("/api/partners");
      },
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to update discount"));
      },
    });

  const { executeAsync: deleteDiscount, isPending: isDeleting } = useAction(
    deleteDiscountAction,
    {
      onSuccess: async () => {
        toast.success("Discount deleted!");
        await mutate(
          (key) => typeof key === "string" && key.startsWith("/api/discounts"),
        );
        await mutatePrefix("/api/partners");
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Failed to delete discount");
      },
    },
  );

  const isSubmitting = isUpdatingLink || isUpdatingEnrollment || isDeleting;

  const openDiscountSheet = (discount: DiscountProps | null = null) => {
    setDiscountSheet({ discount });
    setIsDiscountSheetOpen(true);
  };

  const options = useMemo(
    () =>
      sortedDiscounts.map((discount) => {
        const isGroup = discount.id === groupDiscountId;
        const description = formatDiscountDescription(discount);

        return {
          id: discount.id,
          isGroup,
          partnersCount: discount.partnersCount,
          searchValue: isGroup ? `${description} group` : description,
          label: <ProgramRewardDescription discount={discount} />,
        };
      }),
    [sortedDiscounts, groupDiscountId],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolvedSelectedId) {
      return;
    }

    const currentId = getSelectedDiscountId({
      target,
      groupDiscountId,
    });

    if (resolvedSelectedId === currentId) {
      setShowModal(false);
      return;
    }

    const isGroupSelection = resolvedSelectedId === groupDiscountId;

    if (target.type === "partner") {
      if (!workspaceId) {
        return;
      }

      await updateEnrollment({
        workspaceId,
        partnerId: partner.id,
        discountId: isGroupSelection
          ? groupDiscountId ?? null
          : resolvedSelectedId,
      });
      return;
    }

    await updatePartnerLink(`/api/partners/links/${target.link.id}`, {
      method: "PATCH",
      body: {
        discountId: isGroupSelection ? null : resolvedSelectedId,
      },
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Discount updated");
        await mutatePrefix("/api/partners/links");
      },
    });
  };

  const handleDelete = async (discountId: string) => {
    if (!workspaceId) {
      return;
    }

    if (!confirm("Are you sure you want to delete this discount?")) {
      return;
    }

    await deleteDiscount({
      workspaceId,
      discountId,
    });

    if (resolvedSelectedId === discountId) {
      setSelectedId(groupDiscountId ?? null);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-[540px]"
      preventDefaultClose={isDiscountSheetOpen}
    >
      {discountSheet && (
        <DiscountSheet
          key={discountSheet.discount?.id ?? "new"}
          nested
          isOpen={isDiscountSheetOpen}
          setIsOpen={setIsDiscountSheetOpen}
          discount={discountSheet.discount ?? undefined}
          isDefault={false}
          groupIdOrSlug={partner.groupId}
          onCreated={setSelectedId}
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
            icon={<Discount className="size-4" />}
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
              selectedId={resolvedSelectedId}
              onSelect={setSelectedId}
              onEdit={(id) => {
                const discount = sortedDiscounts.find((item) => item.id === id);
                if (discount) {
                  openDiscountSheet(discount);
                }
              }}
              onDelete={handleDelete}
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
            <h4 className="min-w-0 truncate text-sm font-medium text-neutral-900">
              {partner.name}
            </h4>
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
              disabled={!resolvedSelectedId || options.length === 0}
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

  return useMemo(
    () => ({
      setShowEditPartnerDiscountModal: setShowModal,
      EditPartnerDiscountModal: EditPartnerDiscountModalCallback,
    }),
    [EditPartnerDiscountModalCallback],
  );
}
