"use client";

import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { DefaultPartnerLink } from "@/lib/types";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import { PartnerLinkStructure } from "@dub/prisma/client";
import {
  Button,
  InfoTooltip,
  Input,
  LinkLogo,
  Sheet,
  SimpleTooltipContent,
} from "@dub/ui";
import { ArrowTurnRight2, Eye, Hyperlink } from "@dub/ui/icons";
import { getApexDomain, getPrettyUrl } from "@dub/utils";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface DefaultPartnerLinkSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  link?: {
    domain: string;
    url: string;
    linkStructure: PartnerLinkStructure;
  };
}

function DefaultPartnerLinkSheetContent({
  setIsOpen,
  link,
}: DefaultPartnerLinkSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, watch, setValue } = useForm<DefaultPartnerLink>({
    defaultValues: {
      domain: link?.domain || "",
      url: link?.url || "",
      linkStructure: link?.linkStructure || PartnerLinkStructure.short,
    },
  });

  const [domain, url, linkStructure] = watch([
    "domain",
    "url",
    "linkStructure",
  ]);

  const linkStructureOptions = getLinkStructureOptions({
    domain,
    url,
  });

  const previewLink = useMemo(() => {
    const selectedOption = linkStructureOptions.find(
      (option) => option.id === linkStructure,
    );
    return selectedOption?.example || `${domain}/partner`;
  }, [linkStructureOptions, linkStructure, domain]);

  const onSubmit = async (data: DefaultPartnerLink) => {
    setIsSubmitting(true);
    try {
      // TODO: API call will be implemented by user
      console.log("Submitting data:", data);
      toast.success("Default partner link updated!");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to update default partner link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Create default link
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <LinkSettingsCard
          title={
            <>
              <RewardIconSquare icon={Hyperlink} />
              <span className="leading-relaxed">Link settings</span>
            </>
          }
          content={
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-x-2">
                  <label className="text-content-emphasis block text-sm font-medium">
                    Domain
                  </label>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="Custom domain that will be used for this group's referral links"
                        cta="Learn more"
                        href="https://dub.co/help/article/choosing-a-custom-domain"
                      />
                    }
                  />
                </div>
                <DomainSelector
                  selectedDomain={domain || ""}
                  setSelectedDomain={(domain) =>
                    setValue("domain", domain, { shouldDirty: true })
                  }
                />
                <p className="text-xs font-normal text-neutral-500">
                  Custom domain that will be used for this group's referral
                  links
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-x-2">
                  <label className="text-content-emphasis block text-sm font-medium">
                    Destination URL
                  </label>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="Where people will be redirected after clicking the referral links"
                        cta="Learn more"
                        href="https://dub.co/help/article/destination-urls"
                      />
                    }
                  />
                </div>
                <Input
                  value={url || ""}
                  onChange={(e) =>
                    setValue("url", e.target.value, { shouldDirty: true })
                  }
                  type="url"
                  placeholder="https://acme.dub.sh"
                  className="max-w-full"
                />
                <p className="text-xs font-normal text-neutral-500">
                  Where people will be redirected after clicking the referral
                  links
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-x-2">
                  <label className="text-content-emphasis block text-sm font-medium">
                    Link type
                  </label>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="Choose how your referral links will be structured"
                        cta="Learn more"
                        href="https://dub.co/help/article/link-structures"
                      />
                    }
                  />
                </div>
                <select
                  value={linkStructure}
                  onChange={(e) =>
                    setValue(
                      "linkStructure",
                      e.target.value as PartnerLinkStructure,
                      {
                        shouldDirty: true,
                      },
                    )
                  }
                  className="block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                >
                  {linkStructureOptions.map((type) => (
                    <option
                      key={type.id}
                      value={type.id}
                      disabled={type.comingSoon}
                    >
                      {type.label}
                      {type.comingSoon && " (Coming soon)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
        />

        <LinkSettingsCard
          title={
            <>
              <RewardIconSquare icon={Eye} />
              <span className="leading-relaxed">Link preview</span>
            </>
          }
          content={
            domain && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-neutral-50 p-2">
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="relative flex shrink-0 items-center">
                      <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
                        <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                      </div>
                      <div className="relative z-10 p-2">
                        {url ? (
                          <LinkLogo
                            apexDomain={getApexDomain(url)}
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

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="truncate text-sm font-medium text-neutral-700">
                        {(() => {
                          const selectedOption = linkStructureOptions.find(
                            (option) => option.id === linkStructure,
                          );
                          return selectedOption?.example || `${domain}/partner`;
                        })()}
                      </div>

                      <div className="flex min-h-[20px] items-center gap-1 text-sm text-neutral-500">
                        {url ? (
                          <>
                            <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                            <span className="truncate">
                              {getPrettyUrl(url)}
                            </span>
                          </>
                        ) : (
                          <div className="h-3 w-1/2 rounded-md bg-neutral-200" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        />
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 p-5">
        <div></div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            text="Update link settings"
            className="w-fit"
            loading={isSubmitting}
            disabled={!domain || !url || isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}

function LinkSettingsCard({
  title,
  content,
}: PropsWithChildren<{ title: ReactNode; content: ReactNode }>) {
  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <div className="text-content-emphasis flex items-center gap-2.5 p-2.5 font-medium">
        {title}
      </div>
      {content && (
        <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-50 p-2.5">
          {content}
        </div>
      )}
    </div>
  );
}

export function DefaultPartnerLinkSheet({
  isOpen,
  ...rest
}: DefaultPartnerLinkSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <DefaultPartnerLinkSheetContent {...rest} />
    </Sheet>
  );
}

export function useDefaultPartnerLinkSheet(props: {
  link?: DefaultPartnerLink;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    DefaultPartnerLinkSheet: (
      <DefaultPartnerLinkSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
