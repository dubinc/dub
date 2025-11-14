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
import { SimpleLinkCard } from "@/ui/links/simple-link-card";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import { Button, Input, Modal, Sheet, useMediaQuery } from "@dub/ui";
import { Eye, Hyperlink } from "@dub/ui/icons";
import { normalizeUrl } from "@dub/utils";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
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

  const { setShowChangeDomainModal, ChangeDomainModal } =
    useChangeProgramDomainModal({
      newDomain: domain,
      currentDomain: program?.domain || "",
      url: url || "",
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
      setShowChangeDomainModal(true);
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
      <ChangeDomainModal />
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

type ChangeProgramDomainModalProps = {
  showChangeDomainModal: boolean;
  setShowChangeDomainModal: Dispatch<SetStateAction<boolean>>;
  newDomain: string;
  currentDomain: string;
  url: string;
  onConfirm: () => Promise<void>;
};

function ChangeProgramDomainModal(props: ChangeProgramDomainModalProps) {
  return (
    <Modal
      showModal={props.showChangeDomainModal}
      setShowModal={props.setShowChangeDomainModal}
    >
      <ChangeProgramDomainModalInner {...props} />
    </Modal>
  );
}

function ChangeProgramDomainModalInner({
  setShowChangeDomainModal,
  newDomain,
  currentDomain,
  url,
  onConfirm,
}: ChangeProgramDomainModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [verificationText, setVerificationText] = useState("");
  const { isMobile } = useMediaQuery();

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
      setShowChangeDomainModal(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Switching to a different program domain
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <div className="scrollbar-hide mb-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          <SimpleLinkCard
            link={{
              shortLink: `https://${newDomain}`,
              url: url,
            }}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm text-neutral-800">
            You've selected <strong className="text-black">{newDomain}</strong>,
            which is different from your program's current domain{" "}
            <strong className="text-black">{currentDomain}</strong>.
          </p>
          <p className="text-sm text-neutral-800">
            By making this change, you will:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-800">
            <li>
              Change the program's primary domain to{" "}
              <strong className="text-black">{newDomain}</strong>.
            </li>
            <li>
              Update all default links across all partner groups to use the{" "}
              <strong className="text-black">{newDomain}</strong> domain.
            </li>
            <li>
              Automatically update all partner links to use{" "}
              <strong className="text-black">{newDomain}</strong>, potentially
              breaking them.
            </li>
          </ul>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (verificationText === "confirm change program domain") {
            await handleConfirm();
          }
        }}
        className="flex flex-col bg-neutral-50 text-left"
      >
        <div className="px-4 sm:px-6">
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">confirm change program domain</span>{" "}
            below
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm change program domain"
              required
              autoFocus={!isMobile}
              autoComplete="off"
              value={verificationText}
              onChange={(e) => setVerificationText(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowChangeDomainModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            disabled={verificationText !== "confirm change program domain"}
            loading={confirming}
            text="Continue"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useChangeProgramDomainModal({
  newDomain,
  currentDomain,
  url,
  onConfirm,
}: {
  newDomain: string;
  currentDomain: string;
  url: string;
  onConfirm: () => Promise<void>;
}) {
  const [showChangeDomainModal, setShowChangeDomainModal] = useState(false);

  const ChangeDomainModalCallback = useCallback(() => {
    return (
      <ChangeProgramDomainModal
        showChangeDomainModal={showChangeDomainModal}
        setShowChangeDomainModal={setShowChangeDomainModal}
        newDomain={newDomain}
        currentDomain={currentDomain}
        url={url}
        onConfirm={onConfirm}
      />
    );
  }, [
    showChangeDomainModal,
    setShowChangeDomainModal,
    newDomain,
    currentDomain,
    url,
    onConfirm,
  ]);

  return useMemo(
    () => ({
      setShowChangeDomainModal,
      ChangeDomainModal: ChangeDomainModalCallback,
    }),
    [setShowChangeDomainModal, ChangeDomainModalCallback],
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
