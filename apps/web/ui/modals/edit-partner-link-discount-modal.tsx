import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { DiscountSelector } from "@/ui/partners/link-overrides/discount-selector";
import { useRewardAndDiscountOptions } from "@/ui/partners/link-overrides/use-reward-and-discount-options";
import { Button, Modal } from "@dub/ui";
import { Discount } from "@dub/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];

type DiscountFormData = Pick<
  z.infer<typeof updatePartnerLinkSchema>,
  "discountId"
>;

function getReferenceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

interface EditPartnerLinkDiscountModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  link: PartnerLink;
  partner: Pick<EnrolledPartnerProps, "id" | "groupId">;
  group?: GroupProps | null;
}

function EditPartnerLinkDiscountModal({
  showModal,
  setShowModal,
  link,
  partner,
  group: groupProp,
}: EditPartnerLinkDiscountModalProps) {
  const { slug } = useWorkspace();
  const { group: fetchedGroup } = useGroup({ groupIdOrSlug: partner.groupId });
  const group = groupProp ?? fetchedGroup;
  const { discounts } = useRewardAndDiscountOptions({ group });
  const { makeRequest: updatePartnerLink, isSubmitting } = useApiMutation();

  const { handleSubmit, setValue, control } = useForm<DiscountFormData>({
    defaultValues: {
      discountId: getReferenceId(link.discount),
    },
  });

  useEffect(() => {
    if (!showModal) {
      return;
    }

    setValue("discountId", getReferenceId(link.discount));
  }, [showModal, link, setValue]);

  const onSubmit = async (formData: DiscountFormData) => {
    await updatePartnerLink(`/api/partners/links/${link.id}`, {
      method: "PATCH",
      body: {
        discountId: formData.discountId ?? null,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/partners/links");
        toast.success("Discount updated");
        setShowModal(false);
      },
    });
  };

  const createDiscountHref =
    slug && group?.slug
      ? `/${slug}/program/groups/${group.slug}/discounts?discountId=new&isDefault=false`
      : undefined;

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-medium">Edit discount</h3>
          {createDiscountHref && (
            <Link href={createDiscountHref}>
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

        <div className="flex flex-col gap-6 px-6 py-4">
          <Controller
            control={control}
            name="discountId"
            render={({ field }) => (
              <DiscountSelector
                options={discounts}
                selectedId={field.value}
                groupId={group?.discount?.id}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 p-4">
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
          />
        </div>
      </form>
    </Modal>
  );
}

export function useEditPartnerLinkDiscountModal({
  link,
  partner,
  group,
}: {
  link: PartnerLink | null;
  partner: Pick<EnrolledPartnerProps, "id" | "groupId">;
  group?: GroupProps | null;
}) {
  const [showModal, setShowModal] = useState(false);

  const EditPartnerLinkDiscountModalCallback = useCallback(() => {
    if (!link) {
      return null;
    }

    return (
      <EditPartnerLinkDiscountModal
        showModal={showModal}
        setShowModal={setShowModal}
        link={link}
        partner={partner}
        group={group}
      />
    );
  }, [showModal, link, partner, group]);

  return useMemo(
    () => ({
      setShowEditPartnerLinkDiscountModal: setShowModal,
      EditPartnerLinkDiscountModal: EditPartnerLinkDiscountModalCallback,
    }),
    [EditPartnerLinkDiscountModalCallback],
  );
}
