"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { DefaultPartnerLink } from "@/lib/types";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import {
  Button,
  InfoTooltip,
  Input,
  Sheet,
  SimpleTooltipContent,
} from "@dub/ui";
import { Eye, Hyperlink } from "@dub/ui/icons";

import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PartnerLinkPreview } from "./partner-link-preview";

interface DefaultPartnerLinkSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  link?: DefaultPartnerLink;
}

function DefaultPartnerLinkSheetContent({
  setIsOpen,
  link,
}: DefaultPartnerLinkSheetProps) {
  const { group } = useGroup();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const { handleSubmit, watch, setValue } = useForm<DefaultPartnerLink>({
    defaultValues: {
      domain: link?.domain || "",
      url: link?.url || "",
    },
  });

  const [domain, url] = watch(["domain", "url"]);

  // Save the default link
  const onSubmit = async (data: DefaultPartnerLink) => {
    if (!group) return;

    let updatedDefaultLinks: DefaultPartnerLink[];
    const currentDefaultLinks = group.defaultLinks || [];

    // Check for duplicate destination URL
    const isDuplicate = currentDefaultLinks.some((existingLink) => {
      if (link && existingLink.url === link.url) {
        return false;
      }

      return existingLink.url === data.url;
    });

    if (isDuplicate) {
      toast.error("A default link with this destination URL already exists.");
      return;
    }

    // Editing existing link
    if (link) {
      updatedDefaultLinks = currentDefaultLinks.map((existingLink) => {
        return existingLink.url === link.url ? data : existingLink;
      });
    } else {
      updatedDefaultLinks = [...currentDefaultLinks, data];
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        defaultLinks: updatedDefaultLinks,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        setIsOpen(false);
        toast.success(
          link ? "Link updated successfully!" : "Link created successfully!",
        );
      },
      onError: () => {
        toast.error("Failed to save link. Please try again.");
      },
    });
  };

  const isEditing = !!link;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          {isEditing ? "Edit default link" : "Create default link"}
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
            <PartnerLinkPreview
              url={url}
              domain={domain}
              linkStructure={group?.linkStructure || "query"}
            />
          }
        />
      </div>

      <div className="flex items-center justify-end border-t border-neutral-200 p-5">
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
            text={isEditing ? "Update link" : "Create link"}
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

function DefaultPartnerLinkSheet({
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
