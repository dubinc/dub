import { resizeImage } from "@/lib/images";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { UploadCloud } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { UpgradeToProToast } from "@/ui/shared/upgrade-to-pro-toast";
import {
  ButtonTooltip,
  LoadingCircle,
  LoadingSpinner,
  Magic,
  Popover,
  SimpleTooltipContent,
  Switch,
  Unsplash,
} from "@dub/ui";
import { FADE_IN_ANIMATION_SETTINGS, truncate } from "@dub/utils";
import va from "@vercel/analytics";
import { useCompletion } from "ai/react";
import { motion } from "framer-motion";
import { Link2 } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import UnsplashSearch from "./unsplash-search";

export default function OGSection({
  props,
  data,
  setData,
  generatingMetatags,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
  generatingMetatags: boolean;
}) {
  const { id: workspaceId, exceededAI, mutate } = useWorkspace();

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
          <UpgradeToProToast
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
      va.track("Generated AI Meta Title", {
        metadata: `Title: ${truncate(completion, 255 - (18 + data.url.length))} | URL: ${data.url}`,
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
          <UpgradeToProToast
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
      va.track("Generated AI Meta Description", {
        metadata: `Description: ${truncate(completion, 255 - (25 + data.url.length))} | URL: ${data.url}`,
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

  const [resizing, setResizing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const onChangePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setResizing(true);
    const image = await resizeImage(file);
    setData((prev) => ({ ...prev, image }));
    // delay to prevent flickering
    setTimeout(() => {
      setResizing(false);
    }, 500);
  };

  useEffect(() => {
    if (proxy && props) {
      // if custom OG is enabled
      setData((prev) => ({
        ...prev,
        title: props.title || title,
        description: props.description || description,
        image: props.image || image,
      }));
    }
  }, [proxy]);

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
                  onClick={() => {
                    const image = window.prompt(
                      "Paste a URL to an image.",
                      "https://",
                    );
                    if (image) {
                      setData((prev) => ({ ...prev, image }));
                    }
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-4 w-4 text-gray-500" />
                </ButtonTooltip>
                <Popover
                  content={
                    <UnsplashSearch
                      setData={setData}
                      setOpenPopover={handleSet}
                    />
                  }
                  openPopover={openPopover}
                  setOpenPopover={handleSet}
                >
                  <ButtonTooltip
                    tooltipContent="Find high-resolution photos on Unsplash."
                    onClick={handleSet}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    <Unsplash className="h-3 w-3 text-gray-500" />
                  </ButtonTooltip>
                </Popover>
              </div>
            </div>
            <label
              htmlFor="image"
              className="group relative mt-1 flex aspect-[1200/630] w-full cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 bg-white shadow-sm transition-all hover:bg-gray-50"
            >
              {generatingMetatags && (
                <div className="absolute z-[5] flex h-full w-full items-center justify-center rounded-md bg-white">
                  <LoadingCircle />
                </div>
              )}
              <div
                className="absolute z-[5] h-full w-full rounded-md"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  const file = e.dataTransfer.files && e.dataTransfer.files[0];
                  if (!file) return;
                  setResizing(true);
                  const image = await resizeImage(file);
                  setData((prev) => ({ ...prev, image }));
                  // delay to prevent flickering
                  setTimeout(() => {
                    setResizing(false);
                  }, 500);
                }}
              />
              <div
                className={`${
                  dragActive
                    ? "cursor-copy border-2 border-black bg-gray-50 opacity-100"
                    : ""
                } absolute z-[3] flex h-full w-full flex-col items-center justify-center rounded-md bg-white transition-all ${
                  image
                    ? "opacity-0 group-hover:opacity-100"
                    : "group-hover:bg-gray-50"
                }`}
              >
                {resizing ? (
                  <>
                    <LoadingSpinner />
                    <p className="mt-2 text-center text-sm text-gray-500">
                      Resizing image...
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      className={`${
                        dragActive ? "scale-110" : "scale-100"
                      } h-7 w-7 text-gray-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95`}
                    />
                    <p className="mt-2 text-center text-sm text-gray-500">
                      Drag and drop or click to upload.
                    </p>
                    <p className="mt-2 text-center text-sm text-gray-500">
                      Recommended: 1200 x 630 pixels
                    </p>
                  </>
                )}
                <span className="sr-only">OG image upload</span>
              </div>
              {image && (
                <img
                  src={image}
                  alt="Preview"
                  className="h-full w-full rounded-md object-cover"
                />
              )}
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onChangePicture}
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
    </div>
  );
}
