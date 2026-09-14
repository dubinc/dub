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
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { AdditionalRewardOptionList } from "@/ui/partners/rewards/additional-reward-option-list";
import { Button, Modal } from "@dub/ui";
import { Discount } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
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

function getReferenceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

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
    getReferenceId(target.link.discount) ??
    target.partner.discountId ??
    groupDiscountId ??
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
  const { id: workspaceId, slug } = useWorkspace();
  const { makeRequest: updatePartnerLink, isSubmitting: isUpdatingLink } =
    useApiMutation();
  const { discounts, loading: discountsLoading } = useDiscounts({
    swrOpts: {
      revalidateOnFocus: true,
    },
  });

  const partner = target.partner;
  const { group: fetchedGroup } = useGroup({
    groupIdOrSlug: partner.groupId,
  });
  const group = groupProp ?? fetchedGroup;
  const groupDiscountId = group?.discount?.id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountProps | null>(
    null,
  );

  const sortedDiscounts = useMemo(() => {
    const items = discounts ?? [];

    return [...items].sort((a, b) => {
      if (a.id === groupDiscountId) return -1;
      if (b.id === groupDiscountId) return 1;
      return 0;
    });
  }, [discounts, groupDiscountId]);

  useEffect(() => {
    if (!showModal) {
      return;
    }

    setSelectedId(
      getSelectedDiscountId({
        target,
        groupDiscountId,
      }),
    );
  }, [showModal, groupDiscountId]);

  const { executeAsync: updateEnrollment, isPending: isUpdatingEnrollment } =
    useAction(updatePartnerEnrollmentAction, {
      onSuccess: async () => {
        await mutatePrefix("/api/partners");
        toast.success("Discount updated");
        setShowModal(false);
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

  const createDiscountHref =
    slug && group?.slug
      ? `/${slug}/program/groups/${group.slug}/discounts?default=false`
      : undefined;

  const options = useMemo(
    () =>
      sortedDiscounts.map((discount) => ({
        id: discount.id,
        isGroup: discount.id === groupDiscountId,
        partnersCount: discount.partnersCount,
        label: <ProgramRewardDescription discount={discount} />,
      })),
    [sortedDiscounts, groupDiscountId],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedId) {
      return;
    }

    const isGroupSelection = selectedId === groupDiscountId;

    if (target.type === "partner") {
      if (!workspaceId) {
        return;
      }

      await updateEnrollment({
        workspaceId,
        partnerId: partner.id,
        discountId: isGroupSelection ? groupDiscountId ?? null : selectedId,
      });
      return;
    }

    await updatePartnerLink(`/api/partners/links/${target.link.id}`, {
      method: "PATCH",
      body: {
        discountId: isGroupSelection ? null : selectedId,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/partners/links");
        toast.success("Discount updated");
        setShowModal(false);
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

    if (selectedId === discountId) {
      setSelectedId(groupDiscountId ?? null);
    }
  };

  return (
    <>
      {editingDiscount && (
        <DiscountSheet
          nested
          isOpen={Boolean(editingDiscount)}
          setIsOpen={(open) => {
            const nextOpen = typeof open === "function" ? open(true) : open;
            if (!nextOpen) {
              setEditingDiscount(null);
            }
          }}
          discount={editingDiscount}
        />
      )}
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-[540px]"
      >
        <form onSubmit={onSubmit}>
          <div className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-semibold tracking-tight">
              Edit discount
            </h3>
            {createDiscountHref && (
              <Link
                href={createDiscountHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  variant="secondary"
                  text="Create discount"
                  icon={<Discount className="size-4" />}
                  className="h-8 w-fit px-3"
                />
              </Link>
            )}
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
            ) : options.length > 0 ? (
              <AdditionalRewardOptionList
                options={options}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onEdit={(id) => {
                  const discount = sortedDiscounts.find(
                    (item) => item.id === id,
                  );
                  if (discount) {
                    setEditingDiscount(discount);
                  }
                }}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-content-subtle px-2.5 text-sm">
                No discounts available. Create one to get started.
              </p>
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
                disabled={!selectedId || options.length === 0}
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
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
  propsRef.current = { target, group };

  const EditPartnerDiscountModalCallback = useCallback(() => {
    const { target: currentTarget, group: currentGroup } = propsRef.current;

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
