import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  ButtonTooltip,
  FileUpload,
  LoadingCircle,
  Magic,
  Popover,
  SimpleTooltipContent,
  Switch,
  Unsplash,
} from "@dub/ui";
import { FADE_IN_ANIMATION_SETTINGS, resizeImage } from "@dub/utils";
import { useCompletion } from "ai/react";
import { motion } from "framer-motion";
import { Link2, X } from "lucide-react";
import posthog from "posthog-js";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { usePromptModal } from "../prompt-modal";
import UnsplashSearch from "./unsplash-search";

export default function OGSection({
  data,
  setData,
  generatingMetatags,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
  generatingMetatags: boolean;
}) {
  const { id: workspaceId, exceededAI, mutate } = useWorkspace();

  const { setShowPromptModal, PromptModal } = usePromptModal({
    title: "Use image from URL",
    description:
      "Paste an image URL to use for your link's social media cards.",
    label: "Image URL",
    inputProps: {
      placeholder: "https://example.com/og.png",
    },
    onSubmit: (image) => {
      if (image) setData((prev) => ({ ...prev, image }));
    },
  });

  const { title, description, image, proxy } = data;

  const {
    completion: completionTitle,
    isLoading: generatingTitle,
    complete: completeTitle,
  } = useCompletion({
    api: `/api/ai/completion?workspaceId=${workspaceId}`,
    id: "metatags-title-ai",
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
        url: data.url,
      });
    },
  });

  const generateTitle = async () => {
    completeTitle(
      `You are an SEO expert. Generate an SEO-optimized meta title (max 120 characters) for the following URL:
      
      - URL: ${data.url}
      - Meta title: ${data.title}
      - Meta description: ${data.description}. 

      Only respond with the title without quotation marks or special characters.
      `,
    );
  };

  useEffect(() => {
    if (completionTitle) {
      setData((prev) => ({ ...prev, title: completionTitle }));
    }
  }, [completionTitle]);

  const {
    completion: completionDescription,
    isLoading: generatingDescription,
    complete: completeDescription,
  } = useCompletion({
    api: `/api/ai/completion?workspaceId=${workspaceId}`,
    id: "metatags-description-ai",
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
        url: data.url,
      });
    },
  });

  const generateDescription = async () => {
    completeDescription(
      `You are an SEO expert. Generate an SEO-optimized meta description (max 240 characters) for the following URL:

      - URL: ${data.url}
      - Meta title: ${data.title}
      - Meta description: ${data.description}.

      Only respond with the description without quotation marks or special characters.`,
    );
  };

  useEffect(() => {
    if (completionDescription) {
      setData((prev) => ({ ...prev, description: completionDescription }));
    }
  }, [completionDescription]);

  const [resizingImage, setResizingImage] = useState(false);

  const [cooldown, setCooldown] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  // hacky workaround to fix bug with Radix Popover: https://github.com/radix-ui/primitives/issues/2348#issuecomment-1778941310
  function handleSet() {
    if (cooldown) return;
    setOpenPopover(!openPopover);
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
    }, 200);
  }

  return (
    <div className="relative grid gap-5 border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Custom Social Media Cards
          </h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Customize how your links look when shared on social media."
                cta="Learn more."
                href="https://dub.co/help/article/custom-social-media-cards"
              />
            }
          />
        </div>
        <Switch
          fn={() => setData((prev) => ({ ...prev, proxy: !proxy }))}
          checked={proxy}
        />
      </div>
      {proxy && (
        <motion.div
          key="og-options"
          {...FADE_IN_ANIMATION_SETTINGS}
          className="grid gap-5"
        >
          <div>
            <div className="flex items-center justify-between">
              <p className="block text-sm font-medium text-gray-700">Image</p>
              <div className="flex items-center justify-between">
                <ButtonTooltip
                  tooltipContent="Paste a URL to an image."
                  onClick={() => setShowPromptModal(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-4 w-4 text-gray-500" />
                </ButtonTooltip>
                <Popover
                  content={
                    <UnsplashSearch
                      onImageSelected={(image) =>
                        setData((prev) => ({ ...prev, image }))
                      }
                      setOpenPopover={handleSet}
                    />
                  }
                  openPopover={openPopover}
                  setOpenPopover={handleSet}
                >
                  <button
                    onClick={handleSet}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    <Unsplash className="h-3 w-3 text-gray-500" />
                  </button>
                </Popover>
              </div>
            </div>
            <div className="relative mt-1">
              {image && (
                <button
                  type="button"
                  className="absolute right-2 top-2 z-[5] rounded-full bg-gray-100 p-1 transition-all hover:bg-gray-200"
                  onClick={() => {
                    setData((prev) => ({ ...prev, image: null }));
                  }}
                >
                  <X className="size-3.5" />
                </button>
              )}
              <FileUpload
                accept="images"
                imageSrc={image}
                onChange={async ({ file }) => {
                  setResizingImage(true);

                  const image = await resizeImage(file);
                  setData((prev) => ({
                    ...prev,
                    image,
                  }));

                  // Delay to prevent flickering
                  setTimeout(() => setResizingImage(false), 500);
                }}
                loading={generatingMetatags || resizingImage}
                accessibilityLabel="OG image upload"
                content={
                  <>
                    <p>Drag and drop or click to upload.</p>
                    <p className="mt-2">Recommended: 1200 x 630 pixels</p>
                  </>
                }
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="block text-sm font-medium text-gray-700">Title</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">
                  {title?.length || 0}/120
                </p>
                <ButtonTooltip
                  tooltipContent="Generate an optimized title using AI."
                  onClick={generateTitle}
                  disabled={generatingTitle || !title || exceededAI}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                >
                  {generatingTitle ? (
                    <LoadingCircle />
                  ) : (
                    <Magic className="h-4 w-4" />
                  )}
                </ButtonTooltip>
              </div>
            </div>
            <div className="relative mt-1 flex rounded-md shadow-sm">
              {generatingMetatags && (
                <div className="absolute flex h-full w-full items-center justify-center rounded-md border border-gray-300 bg-white">
                  <LoadingCircle />
                </div>
              )}
              <TextareaAutosize
                name="title"
                id="title"
                minRows={3}
                maxLength={120}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder={`${process.env.NEXT_PUBLIC_APP_NAME} - open-source link management infrastructure.`}
                value={title || ""}
                onChange={(e) => {
                  setData({ ...data, title: e.target.value });
                }}
                aria-invalid="true"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="block text-sm font-medium text-gray-700">
                Description
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">
                  {description?.length || 0}/240
                </p>
                <ButtonTooltip
                  tooltipContent="Generate an optimized description using AI."
                  onClick={generateDescription}
                  disabled={generatingDescription || !description}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                >
                  {generatingDescription ? (
                    <LoadingCircle />
                  ) : (
                    <Magic className="h-4 w-4" />
                  )}
                </ButtonTooltip>
              </div>
            </div>
            <div className="relative mt-1 flex rounded-md shadow-sm">
              {generatingMetatags && (
                <div className="absolute flex h-full w-full items-center justify-center rounded-md border border-gray-300 bg-white">
                  <LoadingCircle />
                </div>
              )}
              <TextareaAutosize
                name="description"
                id="description"
                minRows={3}
                maxLength={240}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder={`${process.env.NEXT_PUBLIC_APP_NAME} is open-source link management infrastructure for modern marketing teams.`}
                value={description || ""}
                onChange={(e) => {
                  setData({
                    ...data,
                    description: e.target.value,
                  });
                }}
                aria-invalid="true"
              />
            </div>
          </div>
        </motion.div>
      )}
      <PromptModal />
    </div>
  );
}
