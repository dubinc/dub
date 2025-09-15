"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { PartnerGroupAdditionalLink } from "@/lib/types";
import { MAX_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { Badge, Button, Input, Modal } from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const URL_VALIDATION_MODES = [
  {
    value: "domain",
    label: "Any page",
    description: "Allows links to any page on this domain",
    recommended: true,
  },
  {
    value: "exact",
    label: "Single page",
    description: "Restricts links to the homepage only",
  },
];

interface AddDestinationUrlModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  link?: PartnerGroupAdditionalLink;
}

function AddDestinationUrlModalContent({
  setIsOpen,
  link,
}: AddDestinationUrlModalProps) {
  const { group } = useGroup();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const { register, handleSubmit, watch, setValue } =
    useForm<PartnerGroupAdditionalLink>({
      defaultValues: {
        domain: link?.domain || "",
        validationMode: link?.validationMode || "domain",
      },
    });

  const [domain, validationMode] = watch(["domain", "validationMode"]);

  const onSubmit = async (data: PartnerGroupAdditionalLink) => {
    if (!group) return;

    const currentAdditionalLinks = group.additionalLinks || [];

    if (link && !currentAdditionalLinks.find((l) => l.domain === link.domain)) {
      toast.error("The link domain you are trying to edit does not exist.");
      return;
    }

    const existingDomains = currentAdditionalLinks.map((l) => l.domain);

    if (existingDomains.includes(data.domain) && data.domain !== link?.domain) {
      toast.error(
        `Domain ${data.domain} has already been added as a link domain`,
      );
      return;
    }

    let updatedAdditionalLinks: PartnerGroupAdditionalLink[];

    if (link) {
      // Editing existing link - find and replace the specific link by domain
      updatedAdditionalLinks = currentAdditionalLinks.map((existingLink) => {
        if (existingLink.domain === link.domain) {
          return {
            ...data,
          };
        }

        return existingLink;
      });
    } else {
      // Check if we're at the maximum number of additional links
      if (currentAdditionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS) {
        toast.error(
          `You can only create up to ${MAX_ADDITIONAL_PARTNER_LINKS} additional link domains.`,
        );
        return;
      }

      // Creating new link
      updatedAdditionalLinks = [...currentAdditionalLinks, data];
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        additionalLinks: updatedAdditionalLinks,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        setIsOpen(false);
        toast.success(
          link
            ? "Link domain updated successfully!"
            : "Link domain added successfully!",
        );
      },
      onError: () => {
        toast.error("Failed to save link domain. Please try again.");
      },
    });
  };

  const isEditing = !!link;

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }}
    >
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit link domain" : "Add link domain"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-800">
              Link domain
            </label>
            <Input
              value={watch("domain") || ""}
              onChange={(e) => setValue("domain", e.target.value)}
              type="text"
              placeholder="acme.com"
              className="max-w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-800">
              Allowed link types
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {URL_VALIDATION_MODES.map((type) => {
                const isSelected = type.value === validationMode;

                return (
                  <label
                    key={type.value}
                    className={cn(
                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                      "transition-all duration-150 hover:bg-neutral-50",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      className="hidden"
                      {...register("validationMode")}
                    />

                    <div className="flex grow flex-col whitespace-nowrap text-sm">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-neutral-600">
                        {type.description}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      {type.recommended && (
                        <Badge variant="blueGradient">Recommended</Badge>
                      )}
                      <CircleCheckFill
                        className={cn(
                          "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                          isSelected && "scale-100 opacity-100",
                        )}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {!link && (
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="conversionTracking"
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                required
              />
              <label
                htmlFor="conversionTracking"
                className="text-sm text-neutral-600"
              >
                I confirm that conversion tracking has been set up on this URL.{" "}
                <a
                  href="https://dub.co/docs/partners/quickstart"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-neutral-900 underline hover:text-neutral-700"
                >
                  Learn more
                </a>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="h-10 w-fit"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            text={isEditing ? "Update link domain" : "Add link domain"}
            className="h-10 w-fit"
            disabled={!domain || !validationMode}
            loading={isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}

export function AddDestinationUrlModal({
  isOpen,
  setIsOpen,
  link,
}: AddDestinationUrlModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <AddDestinationUrlModalContent setIsOpen={setIsOpen} link={link} />
    </Modal>
  );
}

export function useAddDestinationUrlModal(
  props: Omit<AddDestinationUrlModalProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    addDestinationUrlModal: (
      <AddDestinationUrlModal
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
