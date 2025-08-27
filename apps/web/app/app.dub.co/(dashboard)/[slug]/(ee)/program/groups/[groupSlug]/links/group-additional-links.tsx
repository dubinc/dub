"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { AdditionalPartnerLink } from "@/lib/types";
import {
  MAX_ADDITIONAL_PARTNER_LINKS,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, LinkLogo, NumberStepper, Popover } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn, getApexDomain, getPrettyUrl } from "@dub/utils";
import { PropsWithChildren, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAddDestinationUrlModal } from "./add-edit-additional-partner-link-modal";

type FormData = Pick<z.input<typeof updateGroupSchema>, "maxPartnerLinks">;

export function GroupAdditionalLinks() {
  const { group, loading } = useGroup();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();
  const { addDestinationUrlModal, setIsOpen } = useAddDestinationUrlModal({});

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty, isValid },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      maxPartnerLinks: group?.maxPartnerLinks,
    },
  });

  // Reset form values when group data becomes available
  useEffect(() => {
    if (group) {
      reset({
        maxPartnerLinks: group.maxPartnerLinks,
      });
    }
  }, [group, reset]);

  const onSubmit = async (data: FormData) => {
    if (!group) return;

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        toast.success("Saved changes!");
      },
    });
  };

  const additionalLinks = group?.additionalLinks || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex min-h-80 flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        <div className="px-6 py-6">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Additional partner links
          </h3>
          <p className="text-content-subtle text-sm font-normal leading-5">
            Allow and configure extra partner links
          </p>
        </div>

        <SettingsRow
          heading="Link limit"
          description="Set how many extra links a partner can create"
        >
          <NumberStepper
            value={watch("maxPartnerLinks") || 0}
            onChange={(v) =>
              setValue("maxPartnerLinks", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            min={1}
            max={MAX_ADDITIONAL_PARTNER_LINKS}
            step={1}
            className="w-full"
          />
        </SettingsRow>

        <SettingsRow
          heading="Destinations URLs"
          description="Add additional destination URLs the partner can select"
        >
          <div>
            <div className="flex flex-col gap-2">
              {additionalLinks.length > 0 &&
                additionalLinks.map((link, index) => (
                  <DestinationUrl key={index} link={link} />
                ))}
            </div>

            <Button
              text="Add destination URL"
              variant="primary"
              className="mt-4 h-8 w-fit rounded-lg px-3"
              onClick={() => setIsOpen(true)}
              disabled={additionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS}
              disabledTooltip={
                additionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS
                  ? `You can only create up to ${MAX_ADDITIONAL_PARTNER_LINKS} additional destination URLs.`
                  : undefined
              }
            />
          </div>
        </SettingsRow>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
          <div>
            <Button
              text="Save changes"
              className="h-8"
              loading={isSubmitting}
              disabled={!isValid || !isDirty}
            />
          </div>
        </div>
      </div>
      {addDestinationUrlModal}
    </form>
  );
}

function SettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{
  heading: string;
  description: string;
}>) {
  return (
    <div className="grid grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-content-emphasis text-base font-semibold leading-none">
          {heading}
        </h3>
        <p className="text-content-subtle text-sm">{description}</p>
      </div>

      <div>{children}</div>
    </div>
  );
}

function DestinationUrl({ link }: { link: AdditionalPartnerLink }) {
  const { group } = useGroup();
  const [openPopover, setOpenPopover] = useState(false);
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const { addDestinationUrlModal, setIsOpen } = useAddDestinationUrlModal({
    link,
  });

  // Delete destination URL
  const deleteDestinationUrl = async () => {
    if (!group) return;

    const currentAdditionalLinks = group.additionalLinks || [];
    const updatedAdditionalLinks = currentAdditionalLinks.filter(
      (existingLink) => existingLink.url !== link.url,
    );

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        additionalLinks: updatedAdditionalLinks,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        setOpenPopover(false);
        toast.success("Destination URL deleted successfully!");
      },
      onError: () => {
        toast.error("Failed to delete destination URL. Please try again.");
      },
    });
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete Destination URL",
    description: `Are you sure you want to delete "${getPrettyUrl(link.url)}"? This action cannot be undone.`,
    confirmText: "Delete",
    onConfirm: deleteDestinationUrl,
  });

  return (
    <>
      {confirmModal}
      <div className="border-border-subtle group relative flex h-16 cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm">
        <div
          className="flex flex-1 items-center gap-3"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative flex shrink-0 items-center">
            <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
              <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
            </div>
            <div className="relative z-10 p-2">
              {link.url ? (
                <LinkLogo
                  apexDomain={getApexDomain(link.url)}
                  className="size-4 sm:size-6"
                  imageProps={{
                    loading: "lazy",
                  }}
                />
              ) : (
                <div className="size-4 rounded-full bg-neutral-200 sm:size-6" />
              )}
            </div>
          </div>
          <span className="text-content-default truncate text-sm font-semibold">
            {getPrettyUrl(link.url)}
          </span>
        </div>

        <Popover
          content={
            <div className="grid w-48 grid-cols-1 gap-px p-2">
              <Button
                text="Delete"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowConfirmModal(true);
                }}
                icon={<Trash className="size-4" />}
                className="h-9 justify-start px-2 font-medium text-red-600 hover:text-red-700"
                loading={isSubmitting}
              />
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <Button
            variant="secondary"
            className={cn(
              "h-8 w-8 shrink-0 p-0 outline-none transition-all duration-200",
              "border-transparent group-hover:border-neutral-200 data-[state=open]:border-neutral-500",
            )}
            icon={<ThreeDots className="size-4" />}
            onClick={(e) => {
              e.stopPropagation();
              setOpenPopover(!openPopover);
            }}
          />
        </Popover>
      </div>

      {addDestinationUrlModal}
    </>
  );
}
