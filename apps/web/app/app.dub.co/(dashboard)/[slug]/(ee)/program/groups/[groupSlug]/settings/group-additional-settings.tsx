"use client";

import { findGroupsWithMatchingRules } from "@/lib/api/groups/find-groups-with-matching-rules";
import { validateGroupMoveRules } from "@/lib/api/groups/validate-group-move-rules";
import { PAYOUT_HOLDING_PERIOD_DAYS } from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { useGroupMoveRules } from "@/lib/swr/use-group-move-rules";
import { GroupProps } from "@/lib/types";
import { updateGroupSchema } from "@/lib/zod/schemas/groups";
import { GroupSettingsRow } from "@/ui/partners/groups/group-settings-row";
import { Button, Checkbox, Modal, Switch } from "@dub/ui";
import { pluralize } from "@dub/utils";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod/v4";
import { GroupMoveRules } from "./group-move-rules";

type FormData = z.infer<typeof updateGroupSchema>;

export function GroupAdditionalSettings() {
  const { group, loading } = useGroup();
  return (
    <GroupAdditionalSettingsForm group={group ?? null} loading={loading} />
  );
}

function GroupAdditionalSettingsForm({
  group,
  loading,
}: {
  group: GroupProps | null;
  loading: boolean;
}) {
  const { groups, loading: groupsLoading } = useGroupMoveRules();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const [showConfirmAutoApproveModal, setShowConfirmAutoApproveModal] =
    useState(false);
  const [showConfirmHoldingPeriodModal, setShowConfirmHoldingPeriodModal] =
    useState(false);
  const [selectedHoldingPeriodDays, setSelectedHoldingPeriodDays] = useState<
    number | null
  >(null);

  const form = useForm<FormData>({
    defaultValues: {
      moveRules: group?.moveRules ?? [],
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (group) {
      form.reset({ moveRules: group.moveRules ?? [] });
    }
  }, [group]);

  const handleAutoApproveConfirm = async ({
    applyToAllGroups,
  }: {
    applyToAllGroups: boolean;
  }) => {
    if (!group) return;
    const currentValue = group.autoApprovePartnersEnabledAt ? true : false;
    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        autoApprovePartners: !currentValue,
        updateAutoApprovePartnersForAllGroups: applyToAllGroups,
      },
      onSuccess: async () => {
        await mutatePrefix(`/api/groups/${group.slug}`);
        setShowConfirmAutoApproveModal(false);
        toast.success(
          `Successfully ${currentValue ? "disable" : "enable"} auto-approve`,
        );
      },
    });
  };

  const handleHoldingPeriodConfirm = async ({
    applyToAllGroups,
  }: {
    applyToAllGroups: boolean;
  }) => {
    if (selectedHoldingPeriodDays === null || !group) return;

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        holdingPeriodDays: selectedHoldingPeriodDays,
        updateHoldingPeriodDaysForAllGroups: applyToAllGroups,
      },
      onSuccess: async () => {
        await mutatePrefix(`/api/groups/${group.slug}`);
        setShowConfirmHoldingPeriodModal(false);
        toast.success(
          `Successfully set payout holding period to ${selectedHoldingPeriodDays} days`,
        );
      },
    });
  };

  const handleHoldingPeriodCancel = () => {
    setShowConfirmHoldingPeriodModal(false);
    setSelectedHoldingPeriodDays(null);
  };

  const onSubmit = async (data: FormData) => {
    if (!group) return;
    if (data.moveRules && data.moveRules.length > 0) {
      try {
        validateGroupMoveRules(data.moveRules);
      } catch (error) {
        toast.error(error.message);
        return;
      }

      if (groups) {
        const groupsWithMatchingRules = findGroupsWithMatchingRules({
          groups,
          currentRules: data.moveRules,
          currentGroupId: group.id,
        });

        if (groupsWithMatchingRules.length > 0) {
          const groupNames = groupsWithMatchingRules
            .map((g) => g.name)
            .join(", ");
          toast.error(
            `This rule is already in use by the ${groupNames} ${pluralize("group", groupsWithMatchingRules.length)}. Select a different activity or amount.`,
          );
          return;
        }
      }
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        moveRules: data.moveRules,
      },
      onSuccess: async () => {
        await mutate(`/api/groups/${group.id}`);
        await mutatePrefix(`/api/groups/rules`);
        reset({ moveRules: data.moveRules });
        toast.success("Group move rules updated!");
      },
    });
  };

  const isLoading = loading || !group;

  return (
    <>
      {group && (
        <>
          <ConfirmAutoApproveModal
            isOpen={showConfirmAutoApproveModal}
            setIsOpen={setShowConfirmAutoApproveModal}
            onConfirm={handleAutoApproveConfirm}
            isSubmitting={isSubmitting}
            currentValue={group.autoApprovePartnersEnabledAt ? true : false}
          />
          <ConfirmHoldingPeriodModal
            isOpen={showConfirmHoldingPeriodModal}
            setIsOpen={handleHoldingPeriodCancel}
            onConfirm={handleHoldingPeriodConfirm}
            isSubmitting={isSubmitting}
            currentValue={group.holdingPeriodDays}
            newValue={selectedHoldingPeriodDays}
          />
        </>
      )}

      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-border-subtle rounded-lg border">
            <div className="flex flex-col divide-y divide-neutral-200">
              <div className="px-6 py-6">
                <h3 className="text-content-emphasis text-lg font-semibold leading-7">
                  Additional settings
                </h3>
              </div>

              <GroupSettingsRow
                heading="Payout holding period"
                description="[Set how long to hold funds](https://dub.co/help/article/partner-payouts#payout-holding-period) before they are eligible for payout."
              >
                {isLoading ? (
                  <div className="h-[38px] w-full animate-pulse rounded-md bg-neutral-200" />
                ) : (
                  <select
                    className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                    value={
                      selectedHoldingPeriodDays !== null
                        ? selectedHoldingPeriodDays
                        : group!.holdingPeriodDays
                    }
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      if (newValue !== group!.holdingPeriodDays) {
                        setSelectedHoldingPeriodDays(newValue);
                        setShowConfirmHoldingPeriodModal(true);
                      }
                    }}
                  >
                    {PAYOUT_HOLDING_PERIOD_DAYS.map((v) => (
                      <option value={v} key={v}>
                        {v} days {v === 30 && " (recommended)"}
                      </option>
                    ))}
                  </select>
                )}
              </GroupSettingsRow>

              <GroupSettingsRow
                heading="Auto-approve"
                description="[Automatically approve](https://dub.co/help/article/program-applications#auto-approve) new partner applications to this group."
              >
                {isLoading ? (
                  <div className="h-[38px] w-full animate-pulse rounded-md bg-neutral-200" />
                ) : (
                  <label>
                    <div className="flex select-none items-center gap-2">
                      <Switch
                        checked={
                          group!.autoApprovePartnersEnabledAt ? true : false
                        }
                        fn={() => setShowConfirmAutoApproveModal(true)}
                        trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
                      />
                      <span className="text-content-emphasis text-sm">
                        Enable auto-approve
                      </span>
                    </div>
                  </label>
                )}
              </GroupSettingsRow>

              <GroupSettingsRow
                heading="Group move rules"
                description="[Automatically move partners to this group](https://dub.co/help/article/partner-groups#group-move-rules) when they meet specific criteria."
              >
                {isLoading ? (
                  <div className="min-h-28 w-full animate-pulse rounded-md bg-neutral-200" />
                ) : (
                  <GroupMoveRules />
                )}
              </GroupSettingsRow>
            </div>

            {!isLoading && (
              <div className="border-border-subtle flex items-center justify-end rounded-b-lg border-t bg-neutral-50 px-6 py-4">
                <div>
                  <Button
                    text="Save changes"
                    className="h-8"
                    loading={isSubmitting}
                    disabled={!isDirty || groupsLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </FormProvider>
    </>
  );
}

function ConfirmAutoApproveModal({
  isOpen,
  setIsOpen,
  onConfirm,
  isSubmitting,
  currentValue,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: ({ applyToAllGroups }: { applyToAllGroups: boolean }) => void;
  isSubmitting: boolean;
  currentValue: boolean;
}) {
  const [applyToAllGroups, setApplyToAllGroups] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setApplyToAllGroups(false);
    }
  }, [isOpen]);

  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <div className="p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Confirm {currentValue ? "disable" : "enable"} auto-approve
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          New applications will {currentValue ? "not" : ""} be approved
          automatically.
        </p>
      </div>
      <div className="border-border-subtle flex items-center justify-between gap-2 border-t px-5 py-4">
        <label className="flex w-full items-center gap-2.5 text-sm font-medium leading-none">
          <Checkbox
            checked={applyToAllGroups}
            className="border-border-default size-4 rounded focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)] data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
            onCheckedChange={(checked) => setApplyToAllGroups(Boolean(checked))}
          />

          <span className="text-content-emphasis text-sm">
            Apply to all groups
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          />
          <Button
            variant="primary"
            className="h-8 w-fit px-3"
            text="Confirm"
            loading={isSubmitting}
            onClick={() => {
              onConfirm({ applyToAllGroups });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

function ConfirmHoldingPeriodModal({
  isOpen,
  setIsOpen,
  onConfirm,
  isSubmitting,
  currentValue,
  newValue,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: ({ applyToAllGroups }: { applyToAllGroups: boolean }) => void;
  isSubmitting: boolean;
  currentValue: number;
  newValue: number | null;
}) {
  const [applyToAllGroups, setApplyToAllGroups] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setApplyToAllGroups(false);
    }
  }, [isOpen]);

  if (newValue === null) return null;

  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <div className="p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Confirm payout holding period change
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          Change holding period from {currentValue} days to {newValue} days.
        </p>
      </div>
      <div className="border-border-subtle flex items-center justify-between gap-2 border-t px-5 py-4">
        <label className="flex w-full items-center gap-2.5 text-sm font-medium leading-none">
          <Checkbox
            checked={applyToAllGroups}
            className="border-border-default size-4 rounded focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)] data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
            onCheckedChange={(checked) => setApplyToAllGroups(Boolean(checked))}
          />

          <span className="text-content-emphasis text-sm">
            Apply to all groups
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          />
          <Button
            variant="primary"
            className="h-8 w-fit px-3"
            text="Confirm"
            loading={isSubmitting}
            onClick={() => {
              onConfirm({ applyToAllGroups });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
