"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { GroupProps } from "@/lib/types";
import { updateGroupSchema } from "@/lib/zod/schemas/groups";
import { Button, Checkbox, Modal, Switch } from "@dub/ui";
import { useEffect, useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SettingsRow } from "./settings-row";

type FormData = Pick<
  z.input<typeof updateGroupSchema>,
  "autoApprovePartners" | "updateAutoApprovePartnersForAllGroups"
>;

export function GroupApplicationSettings() {
  const { group, loading } = useGroup();

  if (!group || loading) {
    return <GroupSettingsFormSkeleton />;
  }

  return <GroupApplicationSettingsForm group={group} />;
}

function GroupApplicationSettingsForm({ group }: { group: GroupProps }) {
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const form = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      autoApprovePartners: group.autoApprovePartnersEnabledAt ? true : false,
      updateAutoApprovePartnersForAllGroups: false,
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { isDirty, isSubmitSuccessful },
    reset,
  } = form;

  const onSubmit = async (data: FormData) => {
    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        toast.success("Group updated successfully!");
      },
    });
  };

  useEffect(() => {
    if (isSubmitSuccessful)
      reset(getValues(), { keepValues: true, keepDirty: false });
  }, [isSubmitSuccessful, reset, getValues]);

  const [showConfirmAutoApproveModal, setShowConfirmAutoApproveModal] =
    useState(false);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border-subtle rounded-lg border"
    >
      <FormProvider {...form}>
        <ConfirmAutoApproveModal
          isOpen={showConfirmAutoApproveModal}
          setIsOpen={setShowConfirmAutoApproveModal}
          onConfirm={({ applyToAllGroups }) => {
            setValue("autoApprovePartners", !getValues("autoApprovePartners"), {
              shouldDirty: true,
            });
            setValue(
              "updateAutoApprovePartnersForAllGroups",
              applyToAllGroups,
              {
                shouldDirty: true,
              },
            );
          }}
        />
      </FormProvider>
      <div className="flex flex-col divide-y divide-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Applications
          </h3>
        </div>

        <SettingsRow
          heading="Auto-approve"
          description="Automatically approve new partner applications."
        >
          <label>
            <div className="flex select-none items-center gap-2">
              <Controller
                control={control}
                name="autoApprovePartners"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    fn={() => setShowConfirmAutoApproveModal(true)}
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
                  />
                )}
              />
              <span className="text-content-emphasis text-sm">
                Enable auto-approve
              </span>
            </div>
          </label>
        </SettingsRow>
      </div>

      <div className="border-border-subtle flex items-center justify-end rounded-b-lg border-t bg-neutral-50 px-6 py-4">
        <div>
          <Button
            text="Save changes"
            className="h-8"
            loading={isSubmitting}
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

function GroupSettingsFormSkeleton() {
  return (
    <div className="border-border-subtle rounded-lg border">
      <div className="flex flex-col divide-y divide-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Applications
          </h3>
        </div>
        {[...Array(1)].map((_, index) => (
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

      <div className="border-border-subtle flex items-center justify-end rounded-b-lg border-t bg-neutral-50 px-6 py-4">
        <div className="h-8 w-28 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

function ConfirmAutoApproveModal({
  isOpen,
  setIsOpen,
  onConfirm,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: ({ applyToAllGroups }: { applyToAllGroups: boolean }) => void;
}) {
  const { control } = useFormContext<FormData>();

  const currentAutoApprovePartners = useWatch({
    control,
    name: "autoApprovePartners",
  });

  const [applyToAllGroups, setApplyToAllGroups] = useState(false);

  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <div className="p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Confirm {currentAutoApprovePartners ? "disable" : ""} auto-approve
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          New applications will {currentAutoApprovePartners ? "not" : ""} be
          approved automatically.
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
          />
          <Button
            variant="primary"
            className="h-8 w-fit px-3"
            text="Confirm"
            onClick={() => {
              onConfirm({ applyToAllGroups });
              setIsOpen(false);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
