"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useDomains from "@/lib/swr/use-domains";
import useGroup from "@/lib/swr/use-group";
import usePartnerGroupDefaultLinks from "@/lib/swr/use-partner-group-default-links";
import useProgram from "@/lib/swr/use-program";
import { PartnerGroupDefaultLink } from "@/lib/types";
import { createOrUpdateDefaultLinkSchema } from "@/lib/zod/schemas/groups";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import { Button, Input, Sheet } from "@dub/ui";
import { Eye, Hyperlink } from "@dub/ui/icons";
import { normalizeUrl } from "@dub/utils";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PartnerLinkPreview } from "./partner-link-preview";

interface DefaultPartnerLinkSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  link?: PartnerGroupDefaultLink;
}

type FormData = z.infer<typeof createOrUpdateDefaultLinkSchema>;

function DefaultPartnerLinkSheetContent({
  setIsOpen,
  link,
}: DefaultPartnerLinkSheetProps) {
  const { group } = useGroup();
  const { program } = useProgram();
  const { defaultLinks } = usePartnerGroupDefaultLinks();
  const { allWorkspaceDomains } = useDomains();
  const { makeRequest, isSubmitting } = useApiMutation();

  const { handleSubmit, watch, setValue, formState } = useForm<FormData>({
    defaultValues: {
      domain: link?.domain || program?.domain || "",
      url: link?.url || "",
    },
  });

  const [domain, url] = watch(["domain", "url"]);

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Switching to a different program domain",
    description: (
      <div className="mt-2 space-y-3">
        <p>
          You've selected <strong className="text-black">{domain}</strong>,
          which is different from your program's current domain{" "}
          <strong className="text-black">{program?.domain}</strong>.
        </p>
        <p>By making this change, you will:</p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>
            Change the program's primary domain to{" "}
            <strong className="text-black">{domain}</strong>.
          </li>
          <li>
            Update all default links across all partner groups to use the{" "}
            <strong className="text-black">{domain}</strong> domain.
          </li>
          <li>
            Automatically update all partner links to use{" "}
            <strong className="text-black">{domain}</strong>, potentially
            breaking them.
          </li>
        </ul>
        <p className="text-sm font-medium">
          Are you sure you want to continue?
        </p>
      </div>
    ),
    confirmText: "Continue",
    onConfirm: async () => {
      const data = watch();
      await createOrUpdateDefaultLink(data);
    },
  });

  const createOrUpdateDefaultLink = async (data: FormData) => {
    if (!group) return;

    await makeRequest(
      link
        ? `/api/groups/${group.id}/default-links/${link.id}`
        : `/api/groups/${group.id}/default-links`,
      {
        method: link ? "PATCH" : "POST",
        body: {
          domain: data.domain,
          url: data.url,
        },
        onSuccess: async () => {
          setIsOpen(false);
          toast.success(
            link ? "Default link updated!" : "Default link created!",
          );
          await mutatePrefix(["/api/groups", "/api/programs"]);
        },
      },
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!group || !defaultLinks) return;

    // Check if the link already exists
    const existingLink = defaultLinks.find(
      (link) => normalizeUrl(link.url) === normalizeUrl(data.url),
    );

    if (existingLink && existingLink.id !== link?.id) {
      toast.error("A default link with this URL already exists.");
      return;
    }

    // Check if domain is different from program domain
    if (program?.domain && data.domain !== program.domain) {
      setShowConfirmModal(true);
      return;
    }

    await createOrUpdateDefaultLink(data);
  };

  const isEditing = !!link;

  // Check if the selected domain is verified
  const selectedDomainData = allWorkspaceDomains?.find(
    (d) => d.slug === domain,
  );

  return (
    <>
      {confirmModal}
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
                {isEditing && (
                  <div className="space-y-2">
                    <label className="text-content-emphasis block text-sm font-medium">
                      Link domain
                    </label>
                    <DomainSelector
                      selectedDomain={domain || ""}
                      setSelectedDomain={(domain) =>
                        setValue("domain", domain, { shouldDirty: true })
                      }
                    />
                    <p className="text-xs font-normal text-neutral-500">
                      Custom domain for your partner referral links (applies to
                      all{" "}
                      <a
                        href="https://dub.co/help/article/partner-groups"
                        target="_blank"
                        className="cursor-help font-medium text-neutral-800 underline decoration-dotted underline-offset-2"
                      >
                        partner groups
                      </a>
                      )
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-content-emphasis block text-sm font-medium">
                    Destination URL
                  </label>
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
                    Where your partner referral links will redirect to.{" "}
                    <a
                      href="https://dub.co/help/article/partner-link-settings"
                      target="_blank"
                      className="cursor-help font-medium text-neutral-800 underline decoration-dotted underline-offset-2"
                    >
                      Learn more ↗
                    </a>
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
                domain={domain || ""}
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
              disabled={!url || (isEditing && !formState.isDirty)}
            />
          </div>
        </div>
      </form>
    </>
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
  link?: PartnerGroupDefaultLink;
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
