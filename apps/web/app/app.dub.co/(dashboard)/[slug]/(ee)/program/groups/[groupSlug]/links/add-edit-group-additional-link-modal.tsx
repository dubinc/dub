"use client";

import { isValidDomainFormat } from "@/lib/api/domains/is-valid-domain";
import { PartnerGroupAdditionalLink } from "@/lib/types";
import { MAX_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import {
  AnimatedSizeContainer,
  Badge,
  Button,
  Input,
  Modal,
  useMediaQuery,
} from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn, isValidUrl } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// Form input types (different from backend schema for better UX)
type AdditionalLinkFormData = {
  validationMode: "domain" | "exact";
  domain?: string;
  url?: string; // For exact mode - will be parsed into domain + path on submission
};

const URL_VALIDATION_MODES = [
  {
    value: "domain",
    label: "Any URL",
    description: "Allows links to any page on this domain",
    recommended: true,
    placeholder: "acme.com",
  },
  {
    value: "exact",
    label: "Single URL",
    description: "Restricts links to a specific page only",
    recommended: false,
    placeholder: "https://acme.com/specific-page",
  },
] as const;

// Helper functions to convert between form data and backend schema
function partnerLinkToFormData(
  link: PartnerGroupAdditionalLink,
): AdditionalLinkFormData {
  if (link.validationMode === "exact") {
    // Reconstruct URL from domain + path
    const url = link.path
      ? `https://${link.domain}${link.path}`
      : `https://${link.domain}`;
    return {
      validationMode: "exact",
      url,
    };
  }
  return {
    validationMode: "domain",
    domain: link.domain,
  };
}

function formDataToPartnerLink(
  formData: AdditionalLinkFormData,
): PartnerGroupAdditionalLink {
  if (formData.validationMode === "exact" && formData.url) {
    // Parse URL into domain + path
    try {
      const urlObj = new URL(formData.url);
      return {
        validationMode: "exact",
        domain: urlObj.hostname,
        path: urlObj.pathname + urlObj.search + urlObj.hash,
      };
    } catch {
      // Fallback if URL parsing fails
      return {
        validationMode: "exact",
        domain: formData.url,
        path: "",
      };
    }
  }
  return {
    validationMode: "domain",
    domain: formData.domain || "",
    path: "",
  };
}

interface AddDestinationUrlModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  link?: PartnerGroupAdditionalLink;
  additionalLinks: PartnerGroupAdditionalLink[];
  onUpdateAdditionalLinks: (links: PartnerGroupAdditionalLink[]) => void;
}

function AddDestinationUrlModalContent({
  setIsOpen,
  link,
  additionalLinks,
  onUpdateAdditionalLinks,
}: AddDestinationUrlModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AdditionalLinkFormData>({
    defaultValues: link
      ? partnerLinkToFormData(link)
      : {
          validationMode: "domain",
          domain: "",
          url: "",
        },
  });

  const [domain, url, validationMode] = watch([
    "domain",
    "url",
    "validationMode",
  ]);

  useEffect(() => {
    if (validationMode === "domain" && url) {
      setValue("url", "");
    } else if (validationMode === "exact" && domain) {
      setValue("domain", "");
    }
  }, [validationMode, setValue, url, domain]);

  const validateForm = (data: AdditionalLinkFormData): boolean => {
    // Domain mode validation
    if (data.validationMode === "domain") {
      if (!data.domain) {
        return false;
      }

      const domainNormalized = data.domain.trim().toLowerCase();

      if (!isValidDomainFormat(domainNormalized)) {
        setError("domain", {
          type: "manual",
          message: "Please enter a valid domain (eg: acme.com).",
        });
        return false;
      }

      setValue("domain", domainNormalized, { shouldDirty: true });

      // Check for duplicate domains
      const existingDomains = additionalLinks
        .filter((l) => l.validationMode === "domain" && l.domain)
        .map((l) => l.domain!);

      if (
        existingDomains.includes(domainNormalized) &&
        domainNormalized !== link?.domain
      ) {
        setError("domain", {
          type: "value",
          message: `Domain ${domainNormalized} has already been added as a link format`,
        });
        return false;
      }
    }

    // Exact mode validation
    else if (data.validationMode === "exact") {
      if (!data.url) {
        return false;
      }

      const urlTrimmed = data.url.trim();

      if (!isValidUrl(urlTrimmed)) {
        setError("url", {
          type: "manual",
          message: "Please enter a valid URL (eg: https://acme.com/page).",
        });
        return false;
      }

      setValue("url", urlTrimmed, { shouldDirty: true });

      // Convert to backend format for duplicate checking
      const backendData = formDataToPartnerLink(data);
      const existingExactLinks = additionalLinks.filter(
        (l) => l.validationMode === "exact" && l.domain && l.path,
      );

      const isDuplicate = existingExactLinks.some((l) => {
        const isCurrentLink =
          link && l.domain === link.domain && l.path === link.path;
        return (
          !isCurrentLink &&
          l.domain === backendData.domain &&
          l.path === backendData.path
        );
      });

      if (isDuplicate) {
        setError("url", {
          type: "value",
          message: "This URL has already been added",
        });
        return false;
      }
    }

    return true;
  };

  const onSubmit = async (formData: AdditionalLinkFormData) => {
    if (!validateForm(formData)) {
      return;
    }

    // Convert form data to backend schema
    const backendData = formDataToPartnerLink(formData);

    let updatedAdditionalLinks: PartnerGroupAdditionalLink[];

    if (link) {
      updatedAdditionalLinks = additionalLinks.map((existingLink) => {
        const isMatch =
          link.validationMode === "exact"
            ? existingLink.domain === link.domain &&
              existingLink.path === link.path
            : existingLink.domain === link.domain &&
              existingLink.validationMode === "domain";

        return isMatch ? backendData : existingLink;
      });
    } else {
      if (additionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS) {
        toast.error(
          `You can only create up to ${MAX_ADDITIONAL_PARTNER_LINKS} additional link formats.`,
        );
        return;
      }

      updatedAdditionalLinks = [...additionalLinks, backendData];
    }

    // Update the parent form state instead of calling API directly
    onUpdateAdditionalLinks(updatedAdditionalLinks);
    setIsOpen(false);
  };

  const isEditing = !!link;

  const { isMobile } = useMediaQuery();

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
            {isEditing ? "Edit link format" : "Add link format"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div>
            <label className="text-sm font-medium text-neutral-800">
              Allowed link types
            </label>
            <div className="mt-2 grid grid-cols-1 gap-3">
              {URL_VALIDATION_MODES.map((type) => {
                const isSelected = type.value === validationMode;

                return (
                  <div
                    key={type.value}
                    className={cn(
                      "relative w-full rounded-md border border-neutral-200 bg-white text-neutral-600",
                      "overflow-hidden transition-all duration-150",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <label
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-0.5 p-3",
                        "transition-all duration-150 hover:bg-neutral-50",
                        isSelected && "bg-neutral-50",
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

                    <AnimatedSizeContainer height>
                      {isSelected && (
                        <div className="border-t border-neutral-200 p-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-neutral-800">
                              {type.value === "exact" ? "URL" : "Domain"}
                            </label>
                            {type.value === "exact" ? (
                              <Input
                                value={watch("url") || ""}
                                onChange={(e) => {
                                  setValue("url", e.target.value);
                                  clearErrors("url");
                                }}
                                type="text"
                                placeholder={type.placeholder}
                                className="max-w-full"
                                autoFocus={!isMobile}
                                error={errors.url?.message}
                              />
                            ) : (
                              <Input
                                value={watch("domain") || ""}
                                onChange={(e) => {
                                  setValue("domain", e.target.value);
                                  clearErrors("domain");
                                }}
                                type="text"
                                placeholder={type.placeholder}
                                className="max-w-full"
                                autoFocus={!isMobile}
                                error={errors.domain?.message}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </AnimatedSizeContainer>
                  </div>
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
                I confirm that conversion tracking has been set up on this{" "}
                {validationMode === "domain" ? "domain" : "URL"}.{" "}
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
            className="h-9 w-fit"
          />

          <Button
            type="submit"
            variant="primary"
            text={isEditing ? "Update link format" : "Add link format"}
            className="h-9 w-fit"
            disabled={
              !validationMode ||
              (validationMode === "domain" && !domain) ||
              (validationMode === "exact" && !url)
            }
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
  additionalLinks,
  onUpdateAdditionalLinks,
}: AddDestinationUrlModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <AddDestinationUrlModalContent
        setIsOpen={setIsOpen}
        link={link}
        additionalLinks={additionalLinks}
        onUpdateAdditionalLinks={onUpdateAdditionalLinks}
      />
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
