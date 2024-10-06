"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LinkWithTagsProps } from "@/lib/types";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { ShortLinkInputNew } from "@/ui/links/short-link-input-new";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { X } from "@/ui/shared/icons";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  Button,
  InfoTooltip,
  LinkLogo,
  Modal,
  SimpleTooltipContent,
  TooltipContent,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { useEnterSubmit } from "@dub/ui/src";
import { ArrowTurnLeft } from "@dub/ui/src/icons";
import {
  cn,
  DEFAULT_LINK_PROPS,
  getApexDomain,
  getUrlWithoutUTMParams,
  isValidUrl,
  linkConstructor,
} from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
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

export const LinkModalContext = createContext<{
  workspaceId?: string;
  workspacePlan?: string;
  workspaceLogo?: string;
  conversionEnabled?: boolean;
  generatingMetatags: boolean;
}>({ generatingMetatags: false });

export type LinkFormData = LinkWithTagsProps;

type LinkBuilderProps = {
  showLinkBuilder: boolean;
  setShowLinkBuilder: Dispatch<SetStateAction<boolean>>;
  props?: LinkWithTagsProps;
  duplicateProps?: LinkWithTagsProps;
  homepageDemo?: boolean;
};

export function LinkBuilder(props: LinkBuilderProps) {
  return props.showLinkBuilder ? <LinkBuilderOuter {...props} /> : null;
}

function LinkBuilderOuter(props: LinkBuilderProps) {
  const form = useForm<LinkFormData>({
    defaultValues: props.props || props.duplicateProps || DEFAULT_LINK_PROPS,
  });

  return (
    <FormProvider {...form}>
      <LinkBuilderInner {...props} />
    </FormProvider>
  );
}

function LinkBuilderInner({
  showLinkBuilder,
  setShowLinkBuilder,
  props,
  duplicateProps,
  homepageDemo,
}: LinkBuilderProps) {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const {
    id: workspaceId,
    plan,
    nextPlan,
    logo,
    conversionEnabled,
  } = useWorkspace();

  const {
    control,
    watch,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isDirty, isSubmitting, isSubmitSuccessful, errors },
  } = useFormContext<LinkFormData>();

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  const [url, domain, key, proxy, title, description] = watch([
    "url",
    "domain",
    "key",
    "proxy",
    "title",
    "description",
  ]);
  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  const endpoint = useMemo(
    () =>
      props?.id
        ? {
            method: "PATCH",
            url: `/api/links/${props.id}?workspaceId=${workspaceId}`,
          }
        : {
            method: "POST",
            url: `/api/links?workspaceId=${workspaceId}`,
          },
    [props, slug, domain, workspaceId],
  );

  const { generatingMetatags } = useMetatags({
    initial: Boolean(props),
    enabled: showLinkBuilder && !proxy && debouncedUrl.length > 0,
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

  const shortLink = useMemo(
    () =>
      linkConstructor({
        key,
        domain,
        pretty: true,
      }),
    [key, domain],
  );

  const draftControlsRef = useRef<DraftControlsHandle>(null);

  const { UTMModal, UTMButton } = useUTMModal();
  const { ExpirationModal, ExpirationButton } = useExpirationModal();
  const { TargetingModal, TargetingButton } = useTargetingModal();
  const { PasswordModal, PasswordButton } = usePasswordModal();

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
        <LinkModalContext.Provider
          value={{
            workspaceId,
            workspacePlan: plan,
            workspaceLogo: logo ?? undefined,
            conversionEnabled: conversionEnabled,
            generatingMetatags,
          }}
        >
          <form
            ref={formRef}
            onSubmit={handleSubmit(async (data) => {
              // @ts-ignore – exclude extra attributes from `data` object before sending to API
              const { user, tags, tagId, ...rest } = data;
              const folderId = searchParams.get("folderId");
              const bodyData = {
                ...rest,
                // Map tags to tagIds
                tagIds: tags.map(({ id }) => id),
                // if folderId is available, add it to the body data
                ...(folderId ? { folderId } : {}),

                // Manually reset empty strings to null
                expiredUrl: rest.expiredUrl || null,
                ios: rest.ios || null,
                android: rest.android || null,
              };

              try {
                const res = await fetch(endpoint.url, {
                  method: endpoint.method,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(bodyData),
                });

                if (res.status === 200) {
                  await mutate(
                    (key) =>
                      typeof key === "string" && key.startsWith("/api/links"),
                    undefined,
                    { revalidate: true },
                  );
                  const data = await res.json();
                  posthog.capture(
                    props ? "link_updated" : "link_created",
                    data,
                  );

                  // copy shortlink to clipboard when adding a new link
                  if (!props) {
                    try {
                      await navigator.clipboard.writeText(data.shortLink);
                      toast.success("Copied shortlink to clipboard!");
                    } catch (e) {
                      console.error(
                        "Failed to automatically copy shortlink to clipboard.",
                        e,
                      );
                      toast.success("Successfully created link!");
                    }
                  } else toast.success("Successfully updated shortlink!");

                  draftControlsRef.current?.onSubmitSuccessful();
                  setShowLinkBuilder(false);
                } else {
                  const { error } = await res.json();

                  if (error) {
                    if (error.message.includes("Upgrade to")) {
                      toast.custom(() => (
                        <UpgradeRequiredToast
                          title={`You've discovered a ${nextPlan.name} feature!`}
                          message={error.message}
                        />
                      ));
                    } else {
                      toast.error(error.message);
                    }
                    const message = error.message.toLowerCase();

                    if (message.includes("key"))
                      setError("key", { message: error.message });
                    else if (message.includes("url"))
                      setError("url", { message: error.message });
                    else setError("root", { message: "Failed to save link" });
                  } else {
                    setError("root", { message: "Failed to save link" });
                    toast.error("Failed to save link");
                  }
                }
              } catch (e) {
                setError("root", { message: "Failed to save link" });
                console.error("Failed to save link", e);
                toast.error("Failed to save link");
              }
            })}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <LinkLogo
                  apexDomain={getApexDomain(debouncedUrl)}
                  className="size-6 sm:size-6 [&>*]:size-3 sm:[&>*]:size-4"
                />
                <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
                  {props ? `Edit ${shortLink}` : "New link"}
                </h3>
              </div>
              {!homepageDemo && (
                <div className="flex items-center gap-4">
                  {!homepageDemo && workspaceId && (
                    <DraftControls
                      ref={draftControlsRef}
                      props={props}
                      workspaceId={workspaceId}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkBuilder(false);
                      if (searchParams.has("newLink")) {
                        queryParams({
                          del: ["newLink"],
                        });
                      }
                      draftControlsRef.current?.onClose();
                    }}
                    className="group hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 md:block"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div
              className={cn(
                "grid w-full gap-y-6 max-md:overflow-auto md:grid-cols-[2fr_1fr]",
                "max-md:max-h-[calc(100dvh-200px)] max-md:min-h-[min(510px,_calc(100dvh-200px))]",
                "md:[&>div]:max-h-[calc(100dvh-200px)] md:[&>div]:min-h-[min(510px,_calc(100dvh-200px))]",
              )}
            >
              <div className="scrollbar-hide px-6 md:overflow-auto">
                <div className="flex min-h-full flex-col gap-8 py-4">
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
                        showEnterToSubmit={false}
                      />
                    )}
                  />

                  {key !== "_root" && (
                    <ShortLinkInputNew
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

                  <div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="comments"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Comments
                      </label>
                      <InfoTooltip
                        content={
                          <SimpleTooltipContent
                            title="Use comments to add context to your short links – for you and your team."
                            cta="Learn more."
                            href="https://dub.co/help/article/link-comments"
                          />
                        }
                      />
                    </div>
                    <Controller
                      name="comments"
                      control={control}
                      render={({ field }) => (
                        <TextareaAutosize
                          id="comments"
                          name="comments"
                          minRows={3}
                          className="mt-2 block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                          placeholder="Add comments"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      )}
                    />
                  </div>

                  <div className="flex grow flex-col justify-end">
                    <OptionsList />
                  </div>
                </div>
              </div>
              <div className="scrollbar-hide px-6 md:overflow-auto md:pl-0 md:pr-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl border border-gray-200 bg-gray-50 [mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
                  <div className="relative flex flex-col gap-6 p-4">
                    <QRCodePreview />
                    <LinkPreview />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 p-4">
              <div className="flex min-w-0 items-center gap-2">
                <UTMButton />
                <div className="flex items-center gap-2 max-sm:hidden">
                  <ExpirationButton />
                  <TargetingButton />
                  <PasswordButton />
                </div>
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
        </LinkModalContext.Provider>
      </Modal>
    </>
  );
}

export function CreateLinkButton({
  setShowLinkBuilder,
}: {
  setShowLinkBuilder: Dispatch<SetStateAction<boolean>>;
}) {
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
    />
  );
}

export function useLinkBuilder({
  props,
  duplicateProps,
  homepageDemo,
}: {
  props?: LinkWithTagsProps;
  duplicateProps?: LinkWithTagsProps;
  homepageDemo?: boolean;
} = {}) {
  const { flags } = useWorkspace();
  const [showLinkBuilder, setShowLinkBuilder] = useState(false);

  const LinkBuilderCallback = useCallback(() => {
    return (
      <LinkBuilder
        showLinkBuilder={showLinkBuilder}
        setShowLinkBuilder={setShowLinkBuilder}
        props={props}
        duplicateProps={duplicateProps}
        homepageDemo={homepageDemo}
      />
    );
  }, [showLinkBuilder]);

  const CreateLinkButtonCallback = useCallback(() => {
    return <CreateLinkButton setShowLinkBuilder={setShowLinkBuilder} />;
  }, []);

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
