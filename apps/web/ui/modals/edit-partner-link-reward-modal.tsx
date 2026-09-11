import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { RewardSelector } from "@/ui/partners/link-overrides/reward-selector";
import { useRewardAndDiscountOptions } from "@/ui/partners/link-overrides/use-reward-and-discount-options";
import { Button, Modal } from "@dub/ui";
import { Gift } from "@dub/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];

type RewardFormData = Pick<
  z.infer<typeof updatePartnerLinkSchema>,
  "clickRewardId" | "leadRewardId" | "saleRewardId"
>;

function getReferenceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

interface EditPartnerLinkRewardModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  link: PartnerLink;
  partner: Pick<EnrolledPartnerProps, "id" | "groupId">;
  group?: GroupProps | null;
}

function EditPartnerLinkRewardModal({
  showModal,
  setShowModal,
  link,
  partner,
  group: groupProp,
}: EditPartnerLinkRewardModalProps) {
  const { slug } = useWorkspace();
  const { makeRequest: updatePartnerLink, isSubmitting } = useApiMutation();

  const { group: fetchedGroup } = useGroup({
    groupIdOrSlug: partner.groupId,
  });

  const group = groupProp ?? fetchedGroup;

  const { handleSubmit, setValue, control } = useForm<RewardFormData>({
    defaultValues: {
      clickRewardId: getReferenceId(link.clickReward),
      leadRewardId: getReferenceId(link.leadReward),
      saleRewardId: getReferenceId(link.saleReward),
    },
  });

  useEffect(() => {
    if (!showModal) {
      return;
    }

    setValue("clickRewardId", getReferenceId(link.clickReward));
    setValue("leadRewardId", getReferenceId(link.leadReward));
    setValue("saleRewardId", getReferenceId(link.saleReward));
  }, [showModal, link, setValue]);

  const onSubmit = async (formData: RewardFormData) => {
    await updatePartnerLink(`/api/partners/links/${link.id}`, {
      method: "PATCH",
      body: {
        clickRewardId: formData.clickRewardId ?? null,
        leadRewardId: formData.leadRewardId ?? null,
        saleRewardId: formData.saleRewardId ?? null,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/partners/links");
        toast.success("Rewards updated");
        setShowModal(false);
      },
    });
  };

  const createRewardHref =
    slug && group?.slug
      ? `/${slug}/program/groups/${group.slug}/rewards?isDefault=false`
      : undefined;

  const { clickRewards, saleRewards, leadRewards } =
    useRewardAndDiscountOptions({
      group,
    });

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-medium">Edit reward</h3>
          {createRewardHref && (
            <Link href={createRewardHref}>
              <Button
                type="button"
                variant="secondary"
                text="Create reward"
                icon={<Gift className="size-4" />}
                className="h-8 w-fit px-3"
              />
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-6 px-6 py-4">
          <Controller
            control={control}
            name="saleRewardId"
            render={({ field }) => (
              <RewardSelector
                label="Sale reward"
                options={saleRewards}
                selectedId={field.value}
                groupId={group?.saleReward?.id}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="leadRewardId"
            render={({ field }) => (
              <RewardSelector
                label="Lead reward"
                options={leadRewards}
                selectedId={field.value}
                groupId={group?.leadReward?.id}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="clickRewardId"
            render={({ field }) => (
              <RewardSelector
                label="Click reward"
                options={clickRewards}
                selectedId={field.value}
                groupId={group?.clickReward?.id}
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

export function useEditPartnerLinkRewardModal({
  link,
  partner,
  group,
}: {
  link: PartnerLink | null;
  partner: Pick<EnrolledPartnerProps, "id" | "groupId">;
  group?: GroupProps | null;
}) {
  const [showModal, setShowModal] = useState(false);

  const EditPartnerLinkRewardModalCallback = useCallback(() => {
    if (!link) {
      return null;
    }

    return (
      <EditPartnerLinkRewardModal
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
      setShowEditPartnerLinkRewardModal: setShowModal,
      EditPartnerLinkRewardModal: EditPartnerLinkRewardModalCallback,
    }),
    [EditPartnerLinkRewardModalCallback],
  );
}
