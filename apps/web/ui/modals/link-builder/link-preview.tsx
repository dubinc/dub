import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  FileUpload,
  Icon,
  InfoTooltip,
  ShimmerDots,
  SimpleTooltipContent,
  Switch,
  TooltipContent,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import {
  CrownSmall,
  Facebook,
  GlobePointer,
  LinkedIn,
  LoadingCircle,
  NucleoPhoto,
  Pen2,
  Twitter,
} from "@dub/ui/icons";
import { cn, getDomainWithoutWWW, resizeImage } from "@dub/utils";
import {
  ChangeEvent,
  ComponentType,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { LinkFormData, LinkModalContext } from ".";
import { useOGModal } from "./og-modal";

const tabs = ["default", "x", "linkedin", "facebook"] as const;
type Tab = (typeof tabs)[number];

const tabTitles: Record<Tab, string> = {
  default: "Default",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X/Twitter",
};

const tabIcons: Record<Tab, Icon> = {
  default: GlobePointer,
  x: Twitter,
  linkedin: LinkedIn,
  facebook: Facebook,
};

type OGPreviewProps = PropsWithChildren<{
  title: string | null;
  description: string | null;
  hostname: string | null;
  password: string | null;
}>;

const tabComponents: Record<Tab, ComponentType<OGPreviewProps>> = {
  default: DefaultOGPreview,
  x: XOGPreview,
  linkedin: LinkedInOGPreview,
  facebook: FacebookOGPreview,
};

export function LinkPreview() {
  const { slug, plan } = useWorkspace();
  const { watch, setValue } = useFormContext<LinkFormData>();
  const { proxy, title, description, image, url, password } = watch();

  const [debouncedUrl] = useDebounce(url, 500);
  const hostname = useMemo(() => {
    if (password) return "dub.co";
    return getDomainWithoutWWW(debouncedUrl) ?? null;
  }, [password, debouncedUrl]);

  const { OGModal, setShowOGModal } = useOGModal();
  useKeyboardShortcut("l", () => setShowOGModal(true), {
    modal: true,
  });

  const [selectedTab, setSelectedTab] = useState<Tab>("default");

  const onImageChange = (image: string) => {
    setValue("image", image, { shouldDirty: true });
    setValue("proxy", true);
  };

  const OGPreview = tabComponents[selectedTab];

  return (
    <div>
      <OGModal />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-700">
            Custom Link Preview
          </h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Customize how your links look when shared on social media to improve click-through rates. When enabled, the preview settings below will be shown publicly (instead of the URL's original metatags)."
                cta="Learn more."
                href="https://dub.co/help/article/custom-link-previews"
              />
            }
          />
        </div>

        <Switch
          checked={proxy}
          fn={(checked) => setValue("proxy", checked, { shouldDirty: true })}
          disabledTooltip={
            !url ? (
              "Enter a URL to enable custom link previews."
            ) : !plan || plan === "free" ? (
              <TooltipContent
                title="Custom Link Previews are only available on the Pro plan and above."
                cta="Upgrade to Pro"
                href={
                  slug
                    ? `/${slug}/upgrade?exit=close`
                    : "https://dub.co/pricing"
                }
                target="_blank"
              />
            ) : undefined
          }
          thumbIcon={
            !plan || plan === "free" ? (
              <CrownSmall className="size-full text-neutral-500" />
            ) : undefined
          }
        />
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <Button
              key={tab}
              variant="secondary"
              onClick={() => setSelectedTab(tab)}
              icon={
                <Icon className="size-4 text-current" fill="currentColor" />
              }
              className={cn(
                "h-7 text-neutral-800",
                tab === selectedTab
                  ? "border-neutral-400 bg-white drop-shadow-sm"
                  : "border-neutral-300 bg-transparent hover:bg-white",
              )}
              title={tabTitles[tab]}
            />
          );
        })}
      </div>
      <div className="relative mt-2">
        <Button
          type="button"
          variant="secondary"
          icon={<Pen2 className="mx-px size-4" />}
          className="absolute right-2 top-2 z-10 h-8 w-fit px-1.5"
          onClick={() => setShowOGModal(true)}
        />
        <OGPreview
          title={title}
          description={description}
          hostname={hostname}
          password={password}
        >
          <ImagePreview image={image} onImageChange={onImageChange} />
        </OGPreview>
      </div>
    </div>
  );
}

export const ImagePreview = ({
  image,
  onImageChange,
}: {
  image: string | null;
  onImageChange: (image: string) => void;
}) => {
  const { isMobile } = useMediaQuery();

  const { generatingMetatags } = useContext(LinkModalContext);

  const inputFileRef = useRef<HTMLInputElement>(null);

  const [resizing, setResizing] = useState(false);

  const onInputFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size / 1024 / 1024 > 2) {
        toast.error(`File size too big (max 2 MB)`);
        return;
      }

      setResizing(true);

      const src = await resizeImage(file);
      onImageChange(src);

      // Delay to prevent flickering
      setTimeout(() => setResizing(false), 500);
    },
    [],
  );

  const previewImage = useMemo(() => {
    if (generatingMetatags || resizing) {
      return (
        <div className="flex aspect-[var(--aspect,1200/630)] w-full flex-col items-center justify-center bg-neutral-100">
          <LoadingCircle />
        </div>
      );
    }
    if (image) {
      return (
        <FileUpload
          accept="images"
          variant="plain"
          imageSrc={image}
          onChange={async ({ file }) => {
            setResizing(true);

            onImageChange(await resizeImage(file));

            // Delay to prevent flickering
            setTimeout(() => setResizing(false), 500);
          }}
          loading={generatingMetatags || resizing}
          clickToUpload={false}
          showHoverOverlay={false}
          accessibilityLabel="OG image upload"
        />
      );
    } else {
      return (
        <div className="relative aspect-[var(--aspect,1200/630)] w-full bg-white">
          <div className="absolute inset-0 opacity-0">
            <FileUpload
              accept="images"
              variant="plain"
              imageSrc={image}
              onChange={async ({ file }) => {
                setResizing(true);

                onImageChange(await resizeImage(file));

                // Delay to prevent flickering
                setTimeout(() => setResizing(false), 500);
              }}
              loading={generatingMetatags || resizing}
              clickToUpload={false}
              showHoverOverlay={false}
              accessibilityLabel="OG image upload"
            />
          </div>
          {!isMobile && (
            <ShimmerDots className="pointer-events-none opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
          )}
          <div className="pointer-events-none relative flex size-full flex-col items-center justify-center gap-2">
            <NucleoPhoto className="size-5 text-neutral-700" />
            <p className="max-w-32 text-center text-xs text-neutral-700">
              Enter a link to generate a preview
            </p>
          </div>
        </div>
      );
    }
  }, [image, generatingMetatags, resizing]);

  return (
    <>
      {previewImage}
      <input
        key={image}
        ref={inputFileRef}
        onChange={onInputFileChange}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
      />
    </>
  );
};

function DefaultOGPreview({ title, description, children }: OGPreviewProps) {
  const { plan } = useWorkspace();
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div>
      <div className="group relative overflow-hidden rounded-md border border-neutral-300">
        {children}
      </div>
      <ReactTextareaAutosize
        className="mt-4 line-clamp-2 w-full resize-none border-none p-0 text-xs font-medium text-neutral-700 outline-none focus:ring-0"
        value={title || "Add a title..."}
        maxRows={2}
        onChange={(e) => {
          setValue("title", e.currentTarget.value, { shouldDirty: true });
          if (plan && plan !== "free") {
            setValue("proxy", true, { shouldDirty: true });
          }
        }}
      />
      <ReactTextareaAutosize
        className="mt-1.5 line-clamp-2 w-full resize-none border-none p-0 text-xs text-neutral-700/80 outline-none focus:ring-0"
        value={description || "Add a description..."}
        maxRows={2}
        onChange={(e) => {
          setValue("description", e.currentTarget.value, {
            shouldDirty: true,
          });
          if (plan && plan !== "free") {
            setValue("proxy", true, { shouldDirty: true });
          }
        }}
      />
    </div>
  );
}

function FacebookOGPreview({
  title,
  description,
  hostname,
  children,
}: OGPreviewProps) {
  const { plan } = useWorkspace();
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div>
      <div className="relative border border-neutral-300">
        {children}
        {(hostname || title || description) && (
          <div className="grid gap-1 border-t border-neutral-300 bg-[#f2f3f5] p-2">
            {hostname && (
              <p className="text-xs uppercase text-[#606770]">{hostname}</p>
            )}
            <input
              className="truncate border-none bg-transparent p-0 text-xs font-semibold text-[#1d2129] outline-none focus:ring-0"
              value={title || "Add a title..."}
              onChange={(e) => {
                setValue("title", e.currentTarget.value, {
                  shouldDirty: true,
                });
                if (plan && plan !== "free") {
                  setValue("proxy", true, { shouldDirty: true });
                }
              }}
            />
            <ReactTextareaAutosize
              className="mb-1 line-clamp-2 w-full resize-none rounded-md border-none bg-neutral-200 bg-transparent p-0 text-xs text-[#606770] outline-none focus:ring-0"
              value={description || "Add a description..."}
              maxRows={2}
              onChange={(e) => {
                setValue("description", e.currentTarget.value, {
                  shouldDirty: true,
                });
                if (plan && plan !== "free") {
                  setValue("proxy", true, { shouldDirty: true });
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedInOGPreview({ title, hostname, children }: OGPreviewProps) {
  const { plan } = useWorkspace();
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#8c8c8c33] px-4 py-3">
      <div
        className="relative w-32 shrink-0 overflow-hidden rounded-lg"
        style={{ "--aspect": "128/72" } as any}
      >
        {children}
      </div>
      <div className="grid gap-2">
        <ReactTextareaAutosize
          className="line-clamp-2 w-full resize-none border-none p-0 text-sm font-semibold text-[#000000E6] outline-none focus:ring-0"
          value={title || "Add a title..."}
          maxRows={2}
          onChange={(e) => {
            setValue("title", e.currentTarget.value, {
              shouldDirty: true,
            });
            if (plan && plan !== "free") {
              setValue("proxy", true, { shouldDirty: true });
            }
          }}
        />
        <p className="text-xs text-[#00000099]">{hostname || "domain.com"}</p>
      </div>
    </div>
  );
}

function XOGPreview({ title, hostname, children }: OGPreviewProps) {
  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-neutral-300">
        {children}
        <div className="absolute bottom-2 left-0 w-full px-2">
          <div className="w-fit max-w-full rounded bg-black/[0.77] px-1.5 py-px">
            <span className="block max-w-sm truncate text-xs text-white">
              {title || "Add a title..."}
            </span>
          </div>
        </div>
      </div>
      {hostname && (
        <p className="mt-1 text-xs text-[#606770]">From {hostname}</p>
      )}
    </div>
  );
}
