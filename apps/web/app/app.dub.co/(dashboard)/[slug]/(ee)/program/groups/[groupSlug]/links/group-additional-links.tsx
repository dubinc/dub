"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { GroupProps, PartnerGroupAdditionalLink } from "@/lib/types";
import {
  MAX_ADDITIONAL_PARTNER_LINKS,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  InfoTooltip,
  LinkLogo,
  NumberStepper,
  Popover,
  SimpleTooltipContent,
  Switch,
} from "@dub/ui";
import { PenWriting, Trash } from "@dub/ui/icons";
import { cn, getPrettyUrl } from "@dub/utils";
import { PropsWithChildren, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAddDestinationUrlModal } from "./add-edit-group-additional-link-modal";

type FormData = Pick<
  z.input<typeof updateGroupSchema>,
  "maxPartnerLinks" | "additionalLinks"
>;

export function GroupAdditionalLinks() {
  const { group, loading } = useGroup();

  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Additional partner links
          </h3>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Allow partners to create additional referral links."
                cta="Learn more."
                href="https://dub.co/help/article/partner-link-settings#additional-partner-links"
              />
            }
          />
        </div>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Allow and configure extra partner links
        </p>
      </div>

      {group ? (
        <GroupAdditionalLinksForm group={group} />
      ) : loading ? (
        <div className="flex h-[4.5rem] animate-pulse rounded-b-lg border-t border-neutral-200 bg-neutral-100" />
      ) : (
        <div className="text-content-subtle h-20 text-center">
          Failed to load additional partner links settings
        </div>
      )}
    </div>
  );
}

export function GroupAdditionalLinksForm({ group }: { group: GroupProps }) {
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();
  const [enableAdditionalLinks, setEnableAdditionalLinks] = useState(
    group.maxPartnerLinks > 0 || (group.additionalLinks?.length || 0) > 0,
  );

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty, isValid },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      maxPartnerLinks: group.maxPartnerLinks,
      additionalLinks: group.additionalLinks || [],
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!group) return;

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        toast.success("Saved changes!");
        // Reset form to clear dirty state after successful save
        reset(data);
        await mutatePrefix("/api/groups");
      },
    });
  };

  const additionalLinks = watch("additionalLinks") || [];
  const maxPartnerLinks = watch("maxPartnerLinks") || 0;

  const { addDestinationUrlModal, setIsOpen } = useAddDestinationUrlModal({
    additionalLinks,
    onUpdateAdditionalLinks: (links: PartnerGroupAdditionalLink[]) => {
      setValue("additionalLinks", links, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col divide-y divide-neutral-200"
    >
      {enableAdditionalLinks && (
        <>
          <SettingsRow
            heading="Link limit"
            description="Set how many extra links a partner can create"
          >
            <NumberStepper
              value={maxPartnerLinks}
              onChange={(v) =>
                setValue("maxPartnerLinks", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              min={0}
              max={MAX_ADDITIONAL_PARTNER_LINKS}
              step={1}
              className="w-full"
            />
          </SettingsRow>

          <SettingsRow
            heading="Link formats"
            description="Specify the domains or URLs partners can create additional links on"
          >
            <div>
              <div className="flex flex-col gap-2">
                {additionalLinks.length > 0 ? (
                  additionalLinks.map((link, index) => (
                    <LinkDomain
                      key={index}
                      link={link}
                      additionalLinks={additionalLinks}
                      onUpdateAdditionalLinks={(
                        links: PartnerGroupAdditionalLink[],
                      ) => {
                        setValue("additionalLinks", links, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  ))
                ) : (
                  <div className="border-border-subtle text-content-subtle flex h-16 items-center gap-3 rounded-xl border bg-white p-4 text-sm">
                    No link formats configured – partners won't be able to
                    create additional links.
                  </div>
                )}
              </div>

              <Button
                text="Add link format"
                variant="secondary"
                className="mt-4 h-8 w-fit rounded-lg px-3"
                onClick={() => setIsOpen(true)}
                disabled={
                  additionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS
                }
                disabledTooltip={
                  additionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS
                    ? `You can only create up to ${MAX_ADDITIONAL_PARTNER_LINKS} additional link formats.`
                    : undefined
                }
              />
            </div>
          </SettingsRow>
        </>
      )}

      <div className="flex items-center justify-between rounded-b-lg bg-neutral-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <Switch
            checked={enableAdditionalLinks}
            fn={(checked: boolean) => {
              setEnableAdditionalLinks(checked);

              if (!checked) {
                setValue("additionalLinks", [], {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                setValue("maxPartnerLinks", 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
          />
          <span className="text-sm font-medium text-neutral-800">
            Enable additional partner links
          </span>
        </div>
        <div>
          <Button
            type="submit"
            text="Save changes"
            className="h-8"
            loading={isSubmitting}
            disabled={!isValid || !isDirty}
          />
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

function LinkDomain({
  link,
  additionalLinks,
  onUpdateAdditionalLinks,
}: {
  link: PartnerGroupAdditionalLink;
  additionalLinks: PartnerGroupAdditionalLink[];
  onUpdateAdditionalLinks: (links: PartnerGroupAdditionalLink[]) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  const { addDestinationUrlModal, setIsOpen } = useAddDestinationUrlModal({
    link,
    additionalLinks,
    onUpdateAdditionalLinks,
  });

  // Delete link format
  const deleteLinkDomain = async () => {
    const updatedAdditionalLinks = additionalLinks.filter((existingLink) =>
      link.validationMode === "exact"
        ? existingLink.path !== link.path
        : existingLink.domain !== link.domain,
    );

    // Update the parent form state instead of calling API directly
    onUpdateAdditionalLinks(updatedAdditionalLinks);
    setOpenPopover(false);
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete link format",
    description: `Are you sure you want to delete "${getPrettyUrl(link.domain)}"? This will prevent partners from creating links with this domain or URL.`,
    confirmText: "Delete",
    onConfirm: deleteLinkDomain,
  });

  return (
    <>
      {confirmModal}
      <div className="border-border-subtle group relative flex h-16 cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm">
        <div
          className="flex min-w-0 flex-1 items-center gap-3"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative flex shrink-0 items-center">
            <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
              <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
            </div>
            <div className="relative z-10 p-2">
              {link.domain || link.path ? (
                <LinkLogo
                  apexDomain={link.domain}
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
          <span className="text-content-default min-w-0 truncate text-sm font-semibold">
            {link.validationMode === "domain"
              ? link.domain
              : `${link.domain}${link.path}`}
          </span>
        </div>

        <Popover
          content={
            <div className="grid w-48 grid-cols-1 gap-px p-2">
              <Button
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setIsOpen(true);
                }}
                icon={<PenWriting className="size-4" />}
                className="h-9 justify-start px-2"
              />
              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowConfirmModal(true);
                }}
                icon={<Trash className="size-4" />}
                className="h-9 justify-start px-2"
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
