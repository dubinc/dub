"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { LinkCommentsInput } from "@/ui/links/link-builder/controls/link-comments-input";
import { LinkBuilderHeader } from "@/ui/links/link-builder/link-builder-header";
import {
  LinkBuilderProps,
  LinkBuilderProvider,
  useLinkBuilderContext,
} from "@/ui/links/link-builder/link-builder-provider";
import { useLinkBuilderSubmit } from "@/ui/links/link-builder/use-link-builder-submit";
import { ShortLinkInput } from "@/ui/links/short-link-input";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import {
  ArrowTurnLeft,
  Button,
  ButtonProps,
  Modal,
  TooltipContent,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import {
  cn,
  constructURLFromUTMParams,
  getUrlWithoutUTMParams,
  isValidUrl,
} from "@dub/utils";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { ConversionTrackingToggle } from "./conversion-tracking-toggle";
import { DraftControls, DraftControlsHandle } from "./draft-controls";
import { useExpirationModal } from "./expiration-modal";
import { LinkPreview } from "./link-preview";
import { MoreDropdown } from "./more-dropdown";
import { OptionsList } from "./options-list";
import { usePasswordModal } from "./password-modal";
import { QRCodePreview } from "./qr-code-preview";
import { TagSelect } from "./tag-select";
import { useTargetingModal } from "./targeting-modal";
import { useMetatags } from "./use-metatags";
import { useUTMModal } from "./utm-modal";
import { UTMTemplatesButton } from "./utm-templates-button";
import { WebhookSelect } from "./webhook-select";

export type LinkFormData = ExpandedLinkProps;

type LinkBuilderModalProps = {
  showLinkBuilder: boolean;
  setShowLinkBuilder: Dispatch<SetStateAction<boolean>>;
  homepageDemo?: boolean;
};

export function LinkBuilder(props: LinkBuilderProps & LinkBuilderModalProps) {
  return props.showLinkBuilder ? <LinkBuilderOuter {...props} /> : null;
}

function LinkBuilderOuter({
  showLinkBuilder,
  setShowLinkBuilder,
  homepageDemo,
  ...rest
}: LinkBuilderProps & LinkBuilderModalProps) {
  return (
    <LinkBuilderProvider {...rest}>
      <LinkBuilderInner
        showLinkBuilder={showLinkBuilder}
        setShowLinkBuilder={setShowLinkBuilder}
        homepageDemo={homepageDemo}
      />
    </LinkBuilderProvider>
  );
}

function LinkBuilderInner({
  showLinkBuilder,
  setShowLinkBuilder,
  homepageDemo,
}: LinkBuilderModalProps) {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { id: workspaceId, flags } = useWorkspace();

  const { props, duplicateProps } = useLinkBuilderContext();

  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { isDirty, isSubmitting, isSubmitSuccessful, errors },
  } = useFormContext<LinkFormData>();

  const [url, domain, key, title, description] = useWatch({
    control,
    name: ["url", "domain", "key", "title", "description"],
  });

  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  useMetatags({
    initial: Boolean(props),
    enabled: showLinkBuilder && debouncedUrl.length > 0,
  });

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - for an existing link, there's no changes
    */
    return Boolean(
      !showLinkBuilder ||
        isSubmitting ||
        isSubmitSuccessful ||
        (props && !isDirty),
    );
  }, [showLinkBuilder, isSubmitting, isSubmitSuccessful, props, isDirty]);

  const keyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (key?.endsWith("-copy")) keyRef.current?.select();
  }, []);

  const { domains, loading, primaryDomain } = useAvailableDomains({
    currentDomain: domain,
  });

  useEffect(() => {
    // for a new link (no props or duplicateProps), set the domain to the primary domain
    if (!loading && primaryDomain && !props && !duplicateProps) {
      setValue("domain", primaryDomain, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [loading, primaryDomain, props, duplicateProps]);

  const draftControlsRef = useRef<DraftControlsHandle>(null);

  const { UTMModal, UTMButton } = useUTMModal();
  const { ExpirationModal, ExpirationButton } = useExpirationModal();
  const { TargetingModal, TargetingButton } = useTargetingModal();
  const { PasswordModal, PasswordButton } = usePasswordModal();

  const onSubmitSuccess = useCallback(() => {
    draftControlsRef.current?.onSubmitSuccessful();
    setShowLinkBuilder(false);
  }, []);

  const onSubmit = useLinkBuilderSubmit({
    onSuccess: onSubmitSuccess,
  });

  return (
    <>
      <PasswordModal />
      <UTMModal />
      <TargetingModal />
      <ExpirationModal />
      <Modal
        showModal={showLinkBuilder}
        setShowModal={setShowLinkBuilder}
        className="max-w-screen-lg"
        onClose={() => {
          if (searchParams.has("newLink"))
            queryParams({
              del: ["newLink", "newLinkDomain"],
            });
          draftControlsRef.current?.onClose();
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <LinkBuilderHeader
            onClose={() => {
              setShowLinkBuilder(false);
              if (searchParams.has("newLink")) {
                queryParams({
                  del: ["newLink"],
                });
              }
              draftControlsRef.current?.onClose();
            }}
            foldersEnabled={!!flags?.linkFolders}
          >
            <DraftControls
              ref={draftControlsRef}
              props={props}
              workspaceId={workspaceId!}
            />
          </LinkBuilderHeader>

          <div
            className={cn(
              "grid w-full gap-y-6 max-md:overflow-auto md:grid-cols-[2fr_1fr]",
              "max-md:max-h-[calc(100dvh-200px)] max-md:min-h-[min(510px,_calc(100dvh-200px))]",
              "md:[&>div]:max-h-[calc(100dvh-200px)] md:[&>div]:min-h-[min(510px,_calc(100dvh-200px))]",
            )}
          >
            <div className="scrollbar-hide px-6 md:overflow-auto">
              <div className="flex min-h-full flex-col gap-6 py-4">
                <Controller
                  name="url"
                  control={control}
                  render={({ field }) => (
                    <DestinationUrlInput
                      domain={domain}
                      _key={key}
                      value={field.value}
                      domains={domains}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        clearErrors("url");
                        field.onChange(e.target.value);
                      }}
                      required={key !== "_root"}
                      error={errors.url?.message || undefined}
                      right={
                        <div className="-mb-1 h-6">
                          {isValidUrl(url) && (
                            <UTMTemplatesButton
                              onLoad={(params) => {
                                setValue(
                                  "url",
                                  constructURLFromUTMParams(url, params),
                                  {
                                    shouldDirty: true,
                                  },
                                );
                              }}
                            />
                          )}
                        </div>
                      }
                    />
                  )}
                />

                {key !== "_root" && (
                  <ShortLinkInput
                    ref={keyRef}
                    domain={domain}
                    _key={key}
                    existingLinkProps={props}
                    error={errors.key?.message || undefined}
                    onChange={(d) => {
                      clearErrors("key");
                      if (d.domain !== undefined)
                        setValue("domain", d.domain, { shouldDirty: true });
                      if (d.key !== undefined)
                        setValue("key", d.key, { shouldDirty: true });
                    }}
                    data={{ url, title, description }}
                    saving={isSubmitting || isSubmitSuccessful}
                    loading={loading}
                  />
                )}

                <TagSelect />

                <LinkCommentsInput />

                <ConversionTrackingToggle />

                <div className="flex grow flex-col justify-end">
                  <OptionsList />
                </div>
              </div>
            </div>
            <div className="scrollbar-hide px-6 md:overflow-auto md:pl-0 md:pr-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl border border-neutral-200 bg-neutral-50 [mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
                <div className="relative flex flex-col gap-6 p-4">
                  <QRCodePreview />
                  <LinkPreview />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50 p-4">
            <div className="flex min-w-0 items-center gap-2">
              <UTMButton />
              <div className="flex items-center gap-2 max-sm:hidden">
                <ExpirationButton />
                <TargetingButton />
                <PasswordButton />
              </div>
              <WebhookSelect />
              <MoreDropdown />
            </div>
            {homepageDemo ? (
              <Button
                disabledTooltip="This is a demo link. You can't edit it."
                text="Save changes"
                className="h-8 w-fit"
              />
            ) : (
              <Button
                type="submit"
                disabled={saveDisabled}
                loading={isSubmitting || isSubmitSuccessful}
                text={
                  <span className="flex items-center gap-2">
                    {props ? "Save changes" : "Create link"}
                    <div className="rounded border border-white/20 p-1">
                      <ArrowTurnLeft className="size-3.5" />
                    </div>
                  </span>
                }
                className="h-8 w-fit pl-2.5 pr-1.5"
              />
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}

type CreateLinkButtonProps = Partial<ButtonProps>;

export function CreateLinkButton({
  setShowLinkBuilder,
  ...buttonProps
}: {
  setShowLinkBuilder: Dispatch<SetStateAction<boolean>>;
} & CreateLinkButtonProps) {
  const { slug, nextPlan, exceededLinks } = useWorkspace();

  useKeyboardShortcut("c", () => setShowLinkBuilder(true));

  // listen to paste event, and if it's a URL, open the modal and input the URL
  const handlePaste = (e: ClipboardEvent) => {
    const pastedContent = e.clipboardData?.getData("text");
    const target = e.target as HTMLElement;
    const existingModalBackdrop = document.getElementById("modal-backdrop");

    // make sure:
    // - pasted content is a valid URL
    // - user is not typing in an input or textarea
    // - there is no existing modal backdrop (i.e. no other modal is open)
    // - workspace has not exceeded links limit
    if (
      pastedContent &&
      isValidUrl(pastedContent) &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      !existingModalBackdrop &&
      !exceededLinks
    ) {
      setShowLinkBuilder(true);
    }
  };

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <Button
      text="Create link"
      shortcut="C"
      disabledTooltip={
        exceededLinks ? (
          <TooltipContent
            title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
            cta={`Upgrade to ${nextPlan.name}`}
            href={`/${slug}/upgrade`}
          />
        ) : undefined
      }
      onClick={() => setShowLinkBuilder(true)}
      {...buttonProps}
    />
  );
}

export function useLinkBuilder({
  props,
  duplicateProps,
  homepageDemo,
}: {
  props?: ExpandedLinkProps;
  duplicateProps?: ExpandedLinkProps;
  homepageDemo?: boolean;
} = {}) {
  const workspace = useWorkspace();
  const [showLinkBuilder, setShowLinkBuilder] = useState(false);

  const LinkBuilderCallback = useCallback(() => {
    return (
      <LinkBuilder
        showLinkBuilder={showLinkBuilder}
        setShowLinkBuilder={setShowLinkBuilder}
        props={props}
        duplicateProps={duplicateProps}
        homepageDemo={homepageDemo}
        workspace={workspace}
      />
    );
  }, [showLinkBuilder]);

  const CreateLinkButtonCallback = useCallback(
    (props?: CreateLinkButtonProps) => {
      return (
        <CreateLinkButton setShowLinkBuilder={setShowLinkBuilder} {...props} />
      );
    },
    [],
  );

  return useMemo(
    () => ({
      showLinkBuilder,
      setShowLinkBuilder,
      LinkBuilder: LinkBuilderCallback,
      CreateLinkButton: CreateLinkButtonCallback,
    }),
    [showLinkBuilder, LinkBuilderCallback, CreateLinkButtonCallback],
  );
}
