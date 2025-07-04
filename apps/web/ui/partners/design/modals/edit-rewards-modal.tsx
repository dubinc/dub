"use client";

import useDiscounts from "@/lib/swr/use-discounts";
import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import {
  AnimatedSizeContainer,
  Button,
  CursorRays,
  Gift,
  InvoiceDollar,
  LoadingSpinner,
  Modal,
  TriangleWarning,
  UserPlus,
} from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FormProvider, useForm, useFormState, useWatch } from "react-hook-form";
import { formatDiscountDescription } from "../../format-discount-description";
import { formatRewardDescription } from "../../format-reward-description";
import { BrandingFormData, useBrandingFormContext } from "../branding-form";

type EditRewardsModalProps = {
  showEditRewardsModal: boolean;
  setShowEditRewardsModal: Dispatch<SetStateAction<boolean>>;
};

function EditRewardsModal(props: EditRewardsModalProps) {
  return (
    <Modal
      showModal={props.showEditRewardsModal}
      setShowModal={props.setShowEditRewardsModal}
    >
      <EditRewardsModalInner {...props} />
    </Modal>
  );
}

const REWARD_EVENTS = [
  { event: "sale", label: "Sale", icon: InvoiceDollar },
  { event: "lead", label: "Lead", icon: UserPlus },
  { event: "click", label: "Click", icon: CursorRays },
] as const;

function EditRewardsModalInner({
  setShowEditRewardsModal,
}: EditRewardsModalProps) {
  const { program } = useProgram();

  const {
    rewards,
    loading: rewardsLoading,
    error: rewardsError,
  } = useRewards();
  const {
    discounts,
    loading: discountsLoading,
    error: discountsError,
  } = useDiscounts();

  const isLoading = rewardsLoading || discountsLoading;
  const error = rewardsError || discountsError;

  const { getValues: getValuesParent, setValue: setValueParent } =
    useBrandingFormContext();

  const form = useForm<Pick<BrandingFormData, "landerData">>({
    values: {
      landerData: getValuesParent("landerData"),
    },
  });

  const { register, setValue, getValues, handleSubmit } = form;

  // Set default reward selections
  const setDefaultRewards = useCallback(
    (override?: boolean) => {
      if (!rewards?.length) return;

      const landerDataRewards = getValues("landerData.rewards") || {};

      REWARD_EVENTS.forEach(({ event }) => {
        if (!override && landerDataRewards[`${event}RewardId`]) return;

        const defaultReward = rewards.find(
          (r) => r.event === event && r.default,
        );
        setValue(
          `landerData.rewards.${event}RewardId`,
          defaultReward ? defaultReward.id : "none",
        );
      });
    },
    [rewards, getValues, setValue],
  );

  // Set default discount selection
  const setDefaultDiscount = useCallback(
    (override?: boolean) => {
      if (!discounts) return;

      const landerDataRewards = getValues("landerData.rewards") || {};

      if (!override && landerDataRewards.discountId) return;

      const defaultDiscount = discounts.find((d) => d.default);

      setValue(
        `landerData.rewards.discountId`,
        defaultDiscount ? defaultDiscount.id : "none",
      );
    },
    [discounts, program, getValues, setValue],
  );

  useEffect(() => setDefaultRewards(), [setDefaultRewards]);
  useEffect(() => setDefaultDiscount(), [setDefaultDiscount]);

  return (
    <>
      <form
        className="scrollbar-hide max-h-[calc(100dvh-100px)] overflow-y-auto p-4 pt-3"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(({ landerData }) => {
            setValueParent("landerData", landerData, {
              shouldDirty: true,
            });
            setShowEditRewardsModal(false);
          })(e);
        }}
      >
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Rewards
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          Select the rewards and discount shown to new applicants on your
          landing page. These apply only to new partners after approval.
        </p>

        <FormProvider {...form}>
          <AnimatedSizeContainer
            height
            transition={{ ease: "easeInOut", duration: 0.2 }}
            className="-mx-1"
          >
            <div className="px-1 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner className="size-4" />
                </div>
              ) : error ? (
                <p className="text-content-subtle py-4 text-center text-sm">
                  Failed to load rewards
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-6">
                    {/* Sale/click/lead rewards */}
                    {REWARD_EVENTS.map(({ event, label, icon: Icon }) => {
                      const eventRewards = rewards?.filter(
                        (r) => r.event === event,
                      );
                      if (!eventRewards?.length) return null;

                      return (
                        <label key={event}>
                          <span className="text-content-emphasis flex items-center gap-1.5 text-sm font-medium">
                            <Icon className="size-3.5" />
                            {label}
                          </span>
                          <div className="mt-2 rounded-md shadow-sm">
                            <select
                              className={cn(
                                "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              )}
                              {...register(
                                `landerData.rewards.${event}RewardId`,
                              )}
                            >
                              <option value="none">None</option>
                              {eventRewards?.map((reward) => (
                                <option value={reward.id} key={reward.id}>
                                  {reward.name ||
                                    formatRewardDescription({ reward })}{" "}
                                  {reward.default && "(Default)"}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      );
                    })}

                    {/* Discount */}
                    {Boolean(discounts?.length) && (
                      <label>
                        <span className="text-content-emphasis flex items-center gap-1.5 text-sm font-medium">
                          <Gift className="size-3.5" />
                          Discount
                        </span>
                        <div className="mt-2 rounded-md shadow-sm">
                          <select
                            className={cn(
                              "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            )}
                            {...register(`landerData.rewards.discountId`)}
                          >
                            <option value="none">None</option>
                            {discounts?.map((discount) => (
                              <option value={discount.id} key={discount.id}>
                                {formatDiscountDescription({ discount })}{" "}
                                {discount.default && "(Default)"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    )}
                  </div>

                  <NoneSelectedWarning />
                </>
              )}
            </div>
          </AnimatedSizeContainer>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="px-2 text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
              onClick={() => {
                setValue("landerData.rewards", undefined, {
                  shouldDirty: true,
                });
                setDefaultRewards(true);
                setDefaultDiscount(true);
              }}
            >
              Reset to default
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => setShowEditRewardsModal(false)}
              />
              <SaveButton />
            </div>
          </div>
        </FormProvider>
      </form>
    </>
  );
}

const isAllNone = (rewards: BrandingFormData["landerData"]["rewards"]) =>
  rewards &&
  Object.values(rewards).every((value) => !value || value === "none");

function NoneSelectedWarning() {
  const rewards = useWatch({ name: "landerData.rewards" });

  if (!isAllNone(rewards)) return null;

  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <TriangleWarning className="size-4 text-amber-500" />
      <div className="mt-3 flex flex-col gap-2 text-sm text-amber-900">
        <span className="font-semibold">No rewards selected</span>
        <p>You must select at least one reward to continue.</p>
      </div>
    </div>
  );
}

function SaveButton() {
  const { isDirty } = useFormState();
  const rewards = useWatch({ name: "landerData.rewards" });

  return (
    <Button
      type="submit"
      variant="primary"
      text="Save"
      className="h-9 w-fit"
      disabled={!isDirty || isAllNone(rewards)}
    />
  );
}

export function useEditRewardsModal() {
  const [showEditRewardsModal, setShowEditRewardsModal] = useState(false);

  const EditRewardsModalCallback = useCallback(() => {
    return (
      <EditRewardsModal
        showEditRewardsModal={showEditRewardsModal}
        setShowEditRewardsModal={setShowEditRewardsModal}
      />
    );
  }, [showEditRewardsModal, setShowEditRewardsModal]);

  return useMemo(
    () => ({
      setShowEditRewardsModal,
      EditRewardsModal: EditRewardsModalCallback,
    }),
    [setShowEditRewardsModal, EditRewardsModalCallback],
  );
}
