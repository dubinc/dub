"use client";

import { PAYOUT_HOLDING_PERIOD_DAYS } from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { GroupProps } from "@/lib/types";
import { Button, Checkbox, Modal, Switch } from "@dub/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsRow } from "./settings-row";

export function GroupAdditionalSettings() {
  const { group, loading } = useGroup();

  if (!group || loading) {
    return <GroupAdditionalSettingsFormSkeleton />;
  }

  return <GroupOtherSettingsForm group={group} />;
}

function GroupOtherSettingsForm({ group }: { group: GroupProps }) {
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const [showConfirmAutoApproveModal, setShowConfirmAutoApproveModal] =
    useState(false);
  const [showConfirmHoldingPeriodModal, setShowConfirmHoldingPeriodModal] =
    useState(false);
  const [selectedHoldingPeriodDays, setSelectedHoldingPeriodDays] = useState<
    number | null
  >(null);

  const handleAutoApproveConfirm = async ({
    applyToAllGroups,
  }: {
    applyToAllGroups: boolean;
  }) => {
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
    if (selectedHoldingPeriodDays === null) return;

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

  return (
    <div className="border-border-subtle rounded-lg border">
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
      <div className="flex flex-col divide-y divide-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Additional settings
          </h3>
        </div>

        <SettingsRow
          heading="Payout holding period"
          description="Set how long to hold funds before they are eligible for payout."
        >
          <select
            className="block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            value={
              selectedHoldingPeriodDays !== null
                ? selectedHoldingPeriodDays
                : group.holdingPeriodDays
            }
            onChange={(e) => {
              const newValue = Number(e.target.value);
              if (newValue !== group.holdingPeriodDays) {
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
        </SettingsRow>

        <SettingsRow
          heading="Auto-approve"
          description="Automatically approve new partner applications."
        >
          <label>
            <div className="flex select-none items-center gap-2">
              <Switch
                checked={group.autoApprovePartnersEnabledAt ? true : false}
                fn={() => setShowConfirmAutoApproveModal(true)}
                trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
              />
              <span className="text-content-emphasis text-sm">
                Enable auto-approve
              </span>
            </div>
          </label>
        </SettingsRow>
      </div>
    </div>
  );
}

function GroupAdditionalSettingsFormSkeleton() {
  return (
    <div className="border-border-subtle rounded-lg border">
      <div className="flex flex-col divide-y divide-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Additional settings
          </h3>
        </div>
        {[...Array(2)].map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1">
              <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
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
