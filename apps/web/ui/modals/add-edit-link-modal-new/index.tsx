"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LinkWithTagsProps } from "@/lib/types";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { ShortLinkInput } from "@/ui/links/short-link-input";
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
import {
  DEFAULT_LINK_PROPS,
  deepEqual,
  getApexDomain,
  getUrlWithoutUTMParams,
  isValidUrl,
  linkConstructor,
} from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";

export function AddEditLinkModal({
  showAddEditLinkModal,
  setShowAddEditLinkModal,
  props,
  duplicateProps,
  homepageDemo,
}: {
  showAddEditLinkModal: boolean;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  props?: LinkWithTagsProps;
  duplicateProps?: LinkWithTagsProps;
  homepageDemo?: boolean;
}) {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { id: workspaceId, nextPlan } = useWorkspace();

  const {
    control,
    watch,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting, isSubmitSuccessful, errors },
  } = useForm<LinkWithTagsProps>({
    defaultValues: props || duplicateProps || DEFAULT_LINK_PROPS,
  });

  const data = watch();
  const { url, domain, key, proxy } = data;
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

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - key is invalid
      - url is invalid
      - for an existing link, there's no changes
    */
    return Boolean(
      !showAddEditLinkModal ||
        isSubmitting ||
        isSubmitSuccessful ||
        errors.key ||
        errors.url ||
        (props &&
          Object.entries(props).every(([key, value]) => {
            // If the key is "title" or "description" and proxy is not enabled, return true (skip the check)
            if (
              (key === "title" || key === "description" || key === "image") &&
              !proxy
            )
              return true;
            else if (key === "geo")
              return deepEqual(props.geo as object, data.geo as object);

            // Otherwise, check for discrepancy in the current key-value pair
            return data[key] === value;
          })),
    );
  }, [
    showAddEditLinkModal,
    isSubmitting,
    isSubmitSuccessful,
    errors,
    props,
    data,
  ]);

  const keyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (key?.endsWith("-copy")) keyRef.current?.select();
  }, []);

  const { domains, loading, primaryDomain } = useAvailableDomains({
    currentDomain: domain,
  });

  useEffect(() => {
    // for a new link (no props or duplicateProps), set the domain to the primary domain
    if (!loading && primaryDomain && !props && !duplicateProps)
      setValue("domain", primaryDomain);
  }, [loading, primaryDomain, props, duplicateProps]);

  const shortLink = useMemo(
    () =>
      linkConstructor({
        key: data.key,
        domain: data.domain,
        pretty: true,
      }),
    [data.key, data.domain],
  );

  return (
    <Modal
      showModal={showAddEditLinkModal}
      setShowModal={setShowAddEditLinkModal}
      className="max-w-screen-lg"
      preventDefaultClose={homepageDemo ? false : true}
      onClose={() => {
        if (searchParams.has("newLink"))
          queryParams({
            del: ["newLink", "newLinkDomain"],
          });
      }}
    >
      <form
        onSubmit={handleSubmit(async (data) => {
          // @ts-ignore – exclude extra attributes from `data` object before sending to API
          const { user, tags, tagId, ...rest } = data;
          const bodyData = {
            ...rest,
            // Map tags to tagIds
            tagIds: tags.map(({ id }) => id),
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
              posthog.capture(props ? "link_updated" : "link_created", data);

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

              setShowAddEditLinkModal(false);
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
          <div className="flex items-center gap-4">
            <LinkLogo apexDomain={getApexDomain(debouncedUrl)} />
            <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
              {props ? `Edit ${shortLink}` : "Create new link"}
            </h3>
          </div>
          {!homepageDemo && (
            <button
              onClick={() => {
                setShowAddEditLinkModal(false);
                if (searchParams.has("newLink")) {
                  queryParams({
                    del: ["newLink"],
                  });
                }
              }}
              className="group hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="grid max-h-[95dvh] w-full gap-y-6 md:grid-cols-[2fr_1fr] md:overflow-hidden">
          <div className="scrollbar-hide px-6 md:overflow-auto">
            <div className="grid gap-6 py-4">
              <div className="grid gap-6">
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
                  <ShortLinkInput
                    ref={keyRef}
                    domain={domain}
                    _key={key}
                    existingLinkProps={props}
                    error={errors.key?.message || undefined}
                    onChange={(d) => {
                      clearErrors("key");
                      if (d.domain !== undefined) setValue("domain", d.domain);
                      if (d.key !== undefined) setValue("key", d.key);
                    }}
                    data={data}
                    saving={isSubmitting || isSubmitSuccessful}
                    loading={loading}
                    domains={domains}
                  />
                )}

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
                        name="comments"
                        minRows={3}
                        className="mt-2 block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                        placeholder="Add comments"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="scrollbar-hide px-6 md:max-h-[95dvh] md:overflow-auto md:pl-0 md:pr-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl border border-gray-200 bg-gray-50 [mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
              <div className="relative min-h-[300px] p-4"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
          <div></div>
          {homepageDemo ? (
            <Button
              disabledTooltip="This is a demo link. You can't edit it."
              text="Save changes"
              className="h-8 w-fit"
            />
          ) : (
            <Button
              disabled={saveDisabled}
              loading={isSubmitting || isSubmitSuccessful}
              text={props ? "Save changes" : "Create link"}
              className="h-8 w-fit"
            />
          )}
        </div>
      </form>
    </Modal>
  );
}

export function AddEditLinkButton({
  setShowAddEditLinkModal,
}: {
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug, nextPlan, exceededLinks } = useWorkspace();

  useKeyboardShortcut("c", () => setShowAddEditLinkModal(true));

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
      setShowAddEditLinkModal(true);
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
      onClick={() => setShowAddEditLinkModal(true)}
    />
  );
}
