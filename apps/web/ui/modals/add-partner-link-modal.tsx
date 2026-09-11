import { mutatePrefix } from "@/lib/swr/mutate";
import useDiscounts from "@/lib/swr/use-discounts";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import { useRewards } from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps, LinkProps } from "@/lib/types";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import {
  AnimatedSizeContainer,
  ArrowTurnLeft,
  Button,
  Combobox,
  ComboboxOption,
  InfoTooltip,
  Modal,
  useCopyToClipboard,
  useLatestCallback,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod/v4";
import { X } from "../shared/icons";

interface AddPartnerLinkModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (link: LinkProps) => void;
  partner: Pick<EnrolledPartnerProps, "id" | "email" | "groupId">;
}

type FormData = Pick<
  z.infer<typeof createPartnerLinkSchema>,
  | "key"
  | "url"
  | "clickRewardId"
  | "leadRewardId"
  | "saleRewardId"
  | "discountId"
>;

const OVERRIDE_COMBOBOX_BUTTON_PROPS = {
  className: cn(
    "w-full h-10 justify-start px-3",
    "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
    "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
  ),
};

const AddPartnerLinkModal = ({
  showModal,
  setShowModal,
  onSuccess,
  partner,
}: AddPartnerLinkModalProps) => {
  const { program } = useProgram();
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const [, copyToClipboard] = useCopyToClipboard();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOverrides, setShowOverrides] = useState(false);

  const { group } = useGroup({ groupIdOrSlug: partner.groupId });
  const { clickRewards, saleRewards, leadRewards, discounts } =
    useRewardAndDiscountOptions({ group });

  const { register, handleSubmit, watch, setValue, control } =
    useForm<FormData>({
      defaultValues: {
        key: "",
        url: program?.url || "",
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    });

  const key = watch("key");

  useEffect(() => {
    if (!showModal) {
      return;
    }

    setValue("key", "");
    setValue("url", program?.url || "");
    setValue("clickRewardId", null);
    setValue("leadRewardId", null);
    setValue("saleRewardId", null);
    setValue("discountId", null);
    setShowOverrides(false);
    setErrorMessage(null);
  }, [showModal, program?.url, setValue]);

  const onSubmit = async (formData: FormData) => {
    if (!partner.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/partners/links?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            partnerId: partner.id,
            key: formData.key,
            url: formData.url || undefined,
            clickRewardId: formData.clickRewardId || undefined,
            leadRewardId: formData.leadRewardId || undefined,
            saleRewardId: formData.saleRewardId || undefined,
            discountId: formData.discountId || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error.message);
      }

      await Promise.all([
        mutatePrefix("/api/partners/links"),
        mutate(`/api/partners/${partner.id}?workspaceId=${workspaceId}`),
      ]);
      toast.success("Link created successfully!");
      onSuccess?.(data);
      setShowModal(false);
      copyToClipboard(data.shortLink);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col items-start justify-between gap-4 px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <h3 className="text-lg font-medium">New partner link</h3>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="key"
                    className="text-content-emphasis block text-sm font-medium"
                  >
                    Short link
                  </label>

                  <InfoTooltip content="This is the short link that will redirect to your destination URL. [Learn more.](https://dub.co/help/article/how-to-create-link)" />
                </div>
              </div>

              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                  {program?.domain}
                </span>

                <input
                  {...register("key", { required: true })}
                  type="text"
                  id="key"
                  autoFocus={!isMobile}
                  className={
                    "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  }
                  placeholder={partner.email?.split("@")[0] || "short-link"}
                />
              </div>

              {errorMessage && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="url"
                  className="text-content-emphasis block text-sm font-medium"
                >
                  Destination URL
                </label>

                <InfoTooltip content="The URL your users will get redirected to when they visit your short link. [Learn more.](https://dub.co/help/article/how-to-create-link)" />
              </div>

              <div className="relative flex rounded-md shadow-sm">
                <input
                  {...register("url", { required: false })}
                  type="text"
                  placeholder="(optional)"
                  className="z-0 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:z-[1] focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <button
                type="button"
                className="flex w-full items-center gap-2"
                onClick={() => setShowOverrides(!showOverrides)}
              >
                <p className="text-sm text-neutral-600">
                  {showOverrides ? "Hide" : "Show"} rewards and discount
                  overrides
                </p>
                <motion.div
                  animate={{ rotate: showOverrides ? 180 : 0 }}
                  className="text-neutral-600"
                >
                  <ChevronDown className="size-4" />
                </motion.div>
              </button>

              <AnimatedSizeContainer height className="-mx-1">
                {showOverrides && (
                  <div className="flex flex-col gap-6 px-1 pt-4">
                    <Controller
                      control={control}
                      name="saleRewardId"
                      render={({ field }) => (
                        <RewardOrDiscountSelect
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
                        <RewardOrDiscountSelect
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
                        <RewardOrDiscountSelect
                          label="Click reward"
                          options={clickRewards}
                          selectedId={field.value}
                          groupId={group?.clickReward?.id}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="discountId"
                      render={({ field }) => (
                        <RewardOrDiscountSelect
                          label="Discount"
                          options={discounts}
                          selectedId={field.value}
                          groupId={group?.discount?.id}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </div>
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
            text={
              <span className="flex items-center gap-2">
                Create link
                <div className="rounded border border-white/20 p-1">
                  <ArrowTurnLeft className="size-3.5" />
                </div>
              </span>
            }
            className="h-8 w-fit pl-2.5 pr-1.5"
            loading={isSubmitting}
            disabled={!key}
          />
        </div>
      </form>
    </Modal>
  );
};

function GroupBadge() {
  return (
    <span className="rounded-md bg-neutral-200 px-1.5 py-0.5 text-xs font-semibold text-neutral-600">
      Group
    </span>
  );
}

function RewardOrDiscountSelect({
  label,
  options,
  selectedId,
  groupId,
  onChange,
}: {
  label: string;
  options: ComboboxOption<{ isGroup?: boolean }>[];
  selectedId: string | null | undefined;
  groupId: string | null | undefined;
  onChange: (id: string | null) => void;
}) {
  const displayedId = selectedId ?? groupId;
  const selected =
    options.find((option) => option.value === displayedId) ?? null;
  const isGroup = Boolean(displayedId && displayedId === groupId);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-content-emphasis block text-sm font-medium">
        {label}
      </label>
      <Combobox
        selected={selected}
        setSelected={(option) => {
          if (!option) {
            return;
          }

          onChange(option.value === groupId ? null : option.value);
        }}
        options={options}
        caret
        hideSearch
        shouldFilter={false}
        matchTriggerWidth
        placeholder="None"
        popoverProps={{
          contentClassName: "w-[var(--radix-popover-trigger-width)]",
        }}
        buttonProps={OVERRIDE_COMBOBOX_BUTTON_PROPS}
        labelProps={{
          className:
            "flex min-w-0 items-center justify-between gap-2 overflow-hidden",
        }}
        optionRight={(option) =>
          option.meta?.isGroup ? <GroupBadge /> : undefined
        }
      >
        {selected ? (
          <>
            <span className="min-w-0 truncate">{selected.label}</span>
            {isGroup && <GroupBadge />}
          </>
        ) : null}
      </Combobox>
    </div>
  );
}

function useRewardAndDiscountOptions({
  group,
}: {
  group: GroupProps | undefined;
}) {
  const { rewards } = useRewards();
  const { discounts } = useDiscounts();

  return useMemo(() => {
    const clickRewards: ComboboxOption<{ isGroup?: boolean }>[] = [];
    const saleRewards: ComboboxOption<{ isGroup?: boolean }>[] = [];
    const leadRewards: ComboboxOption<{ isGroup?: boolean }>[] = [];

    const optionsByColumn = {
      [REWARD_EVENT_COLUMN_MAPPING.click]: clickRewards,
      [REWARD_EVENT_COLUMN_MAPPING.lead]: leadRewards,
      [REWARD_EVENT_COLUMN_MAPPING.sale]: saleRewards,
    };

    const groupRewardIds = {
      click: group?.clickReward?.id,
      lead: group?.leadReward?.id,
      sale: group?.saleReward?.id,
    };

    for (const reward of rewards ?? []) {
      if (!["click", "lead", "sale"].includes(reward.event)) {
        continue;
      }

      const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];
      const groupRewardId = groupRewardIds[reward.event];

      optionsByColumn[rewardIdColumn].push({
        value: reward.id,
        label: formatRewardDescription(reward),
        first: reward.id === groupRewardId,
        meta: { isGroup: reward.id === groupRewardId },
      });
    }

    const groupDiscountId = group?.discount?.id;
    const discountOptions: ComboboxOption<{ isGroup?: boolean }>[] = (
      discounts ?? []
    ).map((discount) => ({
      value: discount.id,
      label: formatDiscountDescription(discount),
      first: discount.id === groupDiscountId,
      meta: { isGroup: discount.id === groupDiscountId },
    }));

    return {
      clickRewards,
      saleRewards,
      leadRewards,
      discounts: discountOptions,
    };
  }, [
    rewards,
    discounts,
    group?.clickReward?.id,
    group?.leadReward?.id,
    group?.saleReward?.id,
    group?.discount?.id,
  ]);
}

export function useAddPartnerLinkModal({
  onSuccess,
  partner,
}: {
  onSuccess?: (link: LinkProps) => void;
  partner: Pick<EnrolledPartnerProps, "id" | "email" | "groupId">;
}) {
  const [showAddPartnerLinkModal, setShowAddPartnerLinkModal] = useState(false);

  const onSuccessCallback = useLatestCallback(onSuccess);

  const AddPartnerLinkModalCallback = useCallback(() => {
    return (
      <AddPartnerLinkModal
        showModal={showAddPartnerLinkModal}
        setShowModal={setShowAddPartnerLinkModal}
        onSuccess={onSuccessCallback}
        partner={partner}
      />
    );
  }, [
    showAddPartnerLinkModal,
    setShowAddPartnerLinkModal,
    onSuccessCallback,
    partner,
  ]);

  return useMemo(
    () => ({
      setShowAddPartnerLinkModal,
      AddPartnerLinkModal: AddPartnerLinkModalCallback,
    }),
    [setShowAddPartnerLinkModal, AddPartnerLinkModalCallback],
  );
}
