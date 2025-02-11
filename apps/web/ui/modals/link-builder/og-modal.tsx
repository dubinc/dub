import useWorkspace from "@/lib/swr/use-workspace";
import { Link } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  Button,
  ButtonTooltip,
  FileUpload,
  Modal,
  Popover,
  SimpleTooltipContent,
  Tooltip,
} from "@dub/ui";
import { LoadingCircle, Magic, Unsplash } from "@dub/ui/icons";
import { resizeImage } from "@dub/utils";
import { useCompletion } from "ai/react";
import posthog from "posthog-js";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { LinkFormData, LinkModalContext } from ".";
import { usePromptModal } from "../prompt-modal";
import UnsplashSearch from "./unsplash-search";

function OGModal({
  showOGModal,
  setShowOGModal,
}: {
  showOGModal: boolean;
  setShowOGModal: Dispatch<SetStateAction<boolean>>;
}) {
  // Rerender the modal when the showOGModal state changes to reset the form's values
  return showOGModal ? (
    <OGModalInner showOGModal={showOGModal} setShowOGModal={setShowOGModal} />
  ) : null;
}

function OGModalInner({
  showOGModal,
  setShowOGModal,
}: {
  showOGModal: boolean;
  setShowOGModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId, plan, exceededAI, mutate } = useWorkspace();

  const { generatingMetatags } = useContext(LinkModalContext);
  const {
    getValues: getValuesParent,
    watch: watchParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Pick<LinkFormData, "image" | "title" | "description" | "proxy">>({
    defaultValues: {
      image: getValuesParent("image"),
      title: getValuesParent("title"),
      description: getValuesParent("description"),
      proxy: getValuesParent("proxy"),
    },
  });

  const [url, parentProxy] = watchParent(["url", "proxy"]);
  const { image, title, description } = watch();

  const { setShowPromptModal, PromptModal } = usePromptModal({
    title: "Use image from URL",
    description:
      "Paste an image URL to use for your link's social media cards.",
    label: "Image URL",
    inputProps: {
      type: "url",
      placeholder: "https://example.com/og.png",
    },
    onSubmit: (image) => {
      if (!image) return;

      setValue("image", image, { shouldDirty: true });
      if (plan && plan !== "free") {
        setValue("proxy", true, { shouldDirty: true });
      }
    },
  });

  const [openUnsplashPopover, setOpenUnsplashPopover] = useState(false);
  const [resizing, setResizing] = useState(false);

  const {
    completion: completionTitle,
    isLoading: generatingTitle,
    complete: completeTitle,
  } = useCompletion({
    api: `/api/ai/completion?workspaceId=${workspaceId}`,
    onError: (error) => {
      if (error.message.includes("Upgrade to Pro")) {
        toast.custom(() => (
          <UpgradeRequiredToast
            title="You've exceeded your AI usage limit"
            message={error.message}
          />
        ));
      } else {
        toast.error(error.message);
      }
    },
    onFinish: (_, completion) => {
      mutate();
      posthog.capture("ai_meta_title_generated", {
        title: completion,
        url,
      });
    },
  });

  const generateTitle = async () => {
    completeTitle(
      `You are an SEO expert. Generate an SEO-optimized meta title (max 120 characters) for the following URL:
      
      - URL: ${url}
      - Meta title: ${title}
      - Meta description: ${description}. 

      Only respond with the title without quotation marks or special characters.
      `,
    );
  };

  useEffect(() => {
    if (completionTitle) {
      setValue("title", completionTitle, { shouldDirty: true });
      if (plan && plan !== "free") {
        setValue("proxy", true, { shouldDirty: true });
      }
    }
  }, [completionTitle]);

  const {
    completion: completionDescription,
    isLoading: generatingDescription,
    complete: completeDescription,
  } = useCompletion({
    api: `/api/ai/completion?workspaceId=${workspaceId}`,
    onError: (error) => {
      if (error.message.includes("Upgrade to Pro")) {
        toast.custom(() => (
          <UpgradeRequiredToast
            title="You've exceeded your AI usage limit"
            message={error.message}
          />
        ));
      } else {
        toast.error(error.message);
      }
    },
    onFinish: (_, completion) => {
      mutate();
      posthog.capture("ai_meta_description_generated", {
        description: completion,
        url,
      });
    },
  });

  const generateDescription = async () => {
    completeDescription(
      `You are an SEO expert. Generate an SEO-optimized meta description (max 240 characters) for the following URL:

      - URL: ${url}
      - Meta title: ${title}
      - Meta description: ${description}.

      Only respond with the description without quotation marks or special characters.`,
    );
  };

  useEffect(() => {
    if (completionDescription) {
      setValue("description", completionDescription, { shouldDirty: true });
      if (plan && plan !== "free") {
        setValue("proxy", true, { shouldDirty: true });
      }
    }
  }, [completionDescription]);

  return (
    <>
      <PromptModal />
      <Modal
        showModal={showOGModal}
        setShowModal={setShowOGModal}
        className="sm:max-w-[500px]"
      >
        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowOGModal(false);
              (["image", "title", "description", "proxy"] as const).forEach(
                (key) => setValueParent(key, data[key], { shouldDirty: true }),
              );
            })(e);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Link Preview</h3>
              <ProBadgeTooltip
                content={
                  <SimpleTooltipContent
                    title="Customize how your links look when shared on social media to improve click-through rates. When enabled, the preview settings below will be shown publicly (instead of the URL's original metatags)."
                    cta="Learn more."
                    href="https://dub.co/help/article/custom-link-previews"
                  />
                }
              />
            </div>
            <div className="max-md:hidden">
              <Tooltip
                content={
                  <div className="px-2 py-1 text-xs text-neutral-700">
                    Press{" "}
                    <strong className="font-medium text-neutral-950">L</strong>{" "}
                    to open this quickly
                  </div>
                }
                side="right"
              >
                <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
                  L
                </kbd>
              </Tooltip>
            </div>
          </div>

          <div className="scrollbar-hide -m-1 mt-6 flex max-h-[calc(100dvh-250px)] flex-col gap-6 overflow-y-auto p-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="block text-sm font-medium text-neutral-700">
                  Image
                </span>
                <div className="flex items-center gap-2">
                  {image && (
                    <button
                      type="button"
                      className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
                      onClick={() => {
                        setValue("image", null, { shouldDirty: true });
                        setValue("proxy", false, { shouldDirty: true });
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <ButtonTooltip
                    onClick={() => setShowPromptModal(true)}
                    tooltipProps={{
                      content: "Paste a URL to an image",
                    }}
                  >
                    <Link className="size-4" />
                  </ButtonTooltip>
                  <Popover
                    content={
                      <UnsplashSearch
                        onImageSelected={(image) => {
                          setValue("image", image, { shouldDirty: true });
                          if (plan && plan !== "free") {
                            setValue("proxy", true, { shouldDirty: true });
                          }
                        }}
                        setOpenPopover={setOpenUnsplashPopover}
                      />
                    }
                    openPopover={openUnsplashPopover}
                    setOpenPopover={setOpenUnsplashPopover}
                  >
                    <div>
                      <ButtonTooltip
                        onClick={() => setOpenUnsplashPopover(true)}
                        tooltipProps={{
                          content: "Choose an image from Unsplash",
                        }}
                      >
                        <Unsplash className="size-3 text-neutral-500" />
                      </ButtonTooltip>
                    </div>
                  </Popover>
                </div>
              </div>
              <FileUpload
                accept="images"
                variant="default"
                imageSrc={image}
                onChange={async ({ file }) => {
                  setResizing(true);

                  const image = await resizeImage(file);
                  setValue("image", image, { shouldDirty: true });
                  if (plan && plan !== "free") {
                    setValue("proxy", true, { shouldDirty: true });
                  }

                  // Delay to prevent flickering
                  setTimeout(() => setResizing(false), 500);
                }}
                loading={generatingMetatags || resizing}
                clickToUpload={true}
                showHoverOverlay={false}
                accessibilityLabel="OG image upload"
                className="mt-2"
                content={
                  <>
                    <p>Drag and drop or click to upload.</p>
                    <p className="mt-1">Recommended: 1200 x 630 pixels</p>
                  </>
                }
              />
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <p className="block text-sm font-medium text-neutral-700">
                  Title
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-neutral-500">
                    {title?.length || 0}/120
                  </p>
                  <ButtonTooltip
                    tooltipProps={{
                      content: exceededAI
                        ? "You've exceeded your AI usage limit"
                        : !title
                          ? "Enter a title to generate a preview"
                          : "Generate an optimized title using AI.",
                    }}
                    onClick={generateTitle}
                    disabled={generatingTitle || exceededAI || !title}
                  >
                    {generatingTitle ? (
                      <LoadingCircle />
                    ) : (
                      <Magic className="size-4" />
                    )}
                  </ButtonTooltip>
                </div>
              </div>
              <div className="relative mt-1 flex rounded-md shadow-sm">
                {generatingMetatags && (
                  <div className="absolute flex h-full w-full items-center justify-center rounded-md border border-neutral-300 bg-white">
                    <LoadingCircle />
                  </div>
                )}
                <TextareaAutosize
                  name="title"
                  id="title"
                  minRows={2}
                  maxLength={120}
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="Add a title..."
                  value={title || ""}
                  onChange={(e) => {
                    setValue("title", e.target.value, { shouldDirty: true });
                    if (plan && plan !== "free") {
                      setValue("proxy", true, { shouldDirty: true });
                    }
                  }}
                  aria-invalid="true"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between">
                <p className="block text-sm font-medium text-neutral-700">
                  Description
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-neutral-500">
                    {description?.length || 0}/240
                  </p>
                  <ButtonTooltip
                    tooltipProps={{
                      content: exceededAI
                        ? "You've exceeded your AI usage limit"
                        : !description
                          ? "Enter a description to generate a preview"
                          : "Generate an optimized description using AI.",
                    }}
                    onClick={generateDescription}
                    disabled={
                      generatingDescription || exceededAI || !description
                    }
                  >
                    {generatingDescription ? (
                      <LoadingCircle />
                    ) : (
                      <Magic className="size-4" />
                    )}
                  </ButtonTooltip>
                </div>
              </div>
              <div className="relative mt-1 flex rounded-md shadow-sm">
                {generatingMetatags && (
                  <div className="absolute flex h-full w-full items-center justify-center rounded-md border border-neutral-300 bg-white">
                    <LoadingCircle />
                  </div>
                )}
                <TextareaAutosize
                  name="description"
                  id="description"
                  minRows={3}
                  maxLength={240}
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="Add a description..."
                  value={description || ""}
                  onChange={(e) => {
                    setValue("description", e.target.value, {
                      shouldDirty: true,
                    });
                    if (plan && plan !== "free") {
                      setValue("proxy", true, { shouldDirty: true });
                    }
                  }}
                  aria-invalid="true"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
              onClick={() => {
                setValueParent("proxy", false, { shouldDirty: true });
                ["title", "description", "image"].forEach(
                  (key: "title" | "description" | "image") =>
                    setValueParent(key, null, { shouldDirty: true }),
                );
                setShowOGModal(false);
              }}
            >
              Reset to default
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => {
                  reset();
                  setShowOGModal(false);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                text="Save changes"
                className="h-9 w-fit"
                disabled={!isDirty}
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function useOGModal() {
  const [showOGModal, setShowOGModal] = useState(false);

  const OGModalCallback = useCallback(() => {
    return (
      <OGModal showOGModal={showOGModal} setShowOGModal={setShowOGModal} />
    );
  }, [showOGModal, setShowOGModal]);

  return useMemo(
    () => ({
      setShowOGModal,
      OGModal: OGModalCallback,
    }),
    [setShowOGModal, OGModalCallback],
  );
}
