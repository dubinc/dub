import {
  Button,
  FileUpload,
  Icon,
  LoadingCircle,
  ShimmerDots,
  useMediaQuery,
} from "@dub/ui";
import {
  Facebook,
  GlobePointer,
  LinkedIn,
  NucleoPhoto,
  Pen2,
  Twitter,
} from "@dub/ui/src/icons";
import { cn, getDomainWithoutWWW, resizeImage } from "@dub/utils";
import {
  ChangeEvent,
  ComponentType,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { LinkFormData } from ".";

const tabs = ["default", "facebook", "linkedin", "x"] as const;
type Tab = (typeof tabs)[number];

const tabTitles: Record<Tab, string> = {
  default: "Default",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X/Twitter",
};

const tabIcons: Record<Tab, Icon> = {
  default: GlobePointer,
  facebook: Facebook,
  linkedin: LinkedIn,
  x: Twitter,
};

type OGPreviewProps = PropsWithChildren<{
  title: string | null;
  description: string | null;
  hostname: string | null;
  password: string | null;
}>;

const tabComponents: Record<Tab, ComponentType<OGPreviewProps>> = {
  default: DefaultOGPreview,
  facebook: FacebookOGPreview,
  linkedin: LinkedInOGPreview,
  x: XOGPreview,
};

export function LinkPreview({
  generatingMetatags,
}: {
  generatingMetatags: boolean;
}) {
  const { watch, setValue } = useFormContext<LinkFormData>();
  const { title, description, image, url, password } = watch();

  const [debouncedUrl] = useDebounce(url, 500);
  const hostname = useMemo(() => {
    if (password) return "dub.co";
    return getDomainWithoutWWW(debouncedUrl) ?? null;
  }, [password, debouncedUrl]);

  const [selectedTab, setSelectedTab] = useState<Tab>("default");

  const onImageChange = (image: string) => {
    setValue("image", image);
    setValue("proxy", true);
  };

  const OGPreview = tabComponents[selectedTab];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Link Preview</h2>
        <Button
          type="button"
          variant="outline"
          icon={<Pen2 className="mx-px size-4" />}
          className="h-7 w-fit px-1"
          onClick={() => toast.info("WIP")}
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
                "h-7 text-gray-800",
                tab === selectedTab
                  ? "border-gray-400 bg-white drop-shadow-sm"
                  : "border-gray-300 bg-transparent hover:bg-white",
              )}
              title={tabTitles[tab]}
            />
          );
        })}
      </div>
      <div className="mt-2">
        <OGPreview
          title={title}
          description={description}
          hostname={hostname}
          password={password}
        >
          <ImagePreview
            image={image}
            onImageChange={onImageChange}
            generatingMetatags={generatingMetatags}
          />
        </OGPreview>
      </div>
    </div>
  );
}

const ImagePreview = ({
  image,
  onImageChange,
  generatingMetatags,
}: {
  image: string | null;
  onImageChange: (image: string) => void;
  generatingMetatags?: boolean;
}) => {
  const { isMobile } = useMediaQuery();

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
        <div className="flex aspect-[1200/630] w-full flex-col items-center justify-center bg-gray-100">
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
        <div className="relative aspect-[1200/630] w-full bg-white">
          {!isMobile && (
            <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
          )}
          <div className="relative flex size-full flex-col items-center justify-center gap-2">
            <NucleoPhoto className="size-5 text-gray-700" />
            <p className="max-w-32 text-center text-xs text-gray-700">
              Enter a link to generate a preview.
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
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div>
      <div className="group relative overflow-hidden rounded-md border border-gray-300">
        {children}
      </div>
      {title && (
        <ReactTextareaAutosize
          className="mt-4 line-clamp-2 w-full resize-none border-none p-0 text-xs font-medium text-gray-700 outline-none focus:ring-0"
          value={title}
          maxRows={2}
          onChange={(e) => {
            setValue("title", e.currentTarget.value);
            setValue("proxy", true);
          }}
        />
      )}
      {description && (
        <ReactTextareaAutosize
          className="mt-2.5 line-clamp-2 w-full resize-none border-none p-0 text-xs text-gray-700/80 outline-none focus:ring-0"
          value={description}
          maxRows={2}
          onChange={(e) => {
            setValue("description", e.currentTarget.value);
            setValue("proxy", true);
          }}
        />
      )}
    </div>
  );
}

function FacebookOGPreview({
  title,
  description,
  hostname,
  children,
}: OGPreviewProps) {
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div>
      <div className="relative border border-gray-300">
        {children}
        <div className="grid gap-1 border-t border-gray-300 bg-[#f2f3f5] p-2">
          {hostname ? (
            <p className="text-xs uppercase text-[#606770]">{hostname}</p>
          ) : (
            <div className="h-4 w-24 rounded-md bg-gray-200" />
          )}
          {title || title === "" ? (
            <input
              className="truncate border-none bg-transparent p-0 text-xs font-semibold text-[#1d2129] outline-none focus:ring-0"
              value={title}
              onChange={(e) => {
                setValue("title", e.currentTarget.value);
                setValue("proxy", true);
              }}
            />
          ) : (
            <div className="h-4 w-full rounded-md bg-gray-200" />
          )}
          {description || description === "" ? (
            <ReactTextareaAutosize
              className="mb-1 line-clamp-2 w-full resize-none rounded-md border-none bg-gray-200 bg-transparent p-0 text-xs text-[#606770] outline-none focus:ring-0"
              value={description}
              maxRows={2}
              onChange={(e) => {
                setValue("description", e.currentTarget.value);
                setValue("proxy", true);
              }}
            />
          ) : (
            <div className="grid gap-1">
              <div className="h-4 w-full rounded-md bg-gray-200" />
              <div className="h-4 w-48 rounded-md bg-gray-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkedInOGPreview({ title, hostname, children }: OGPreviewProps) {
  const { setValue } = useFormContext<LinkFormData>();

  return (
    <div>
      <div className="relative overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]">
        {children}
        <div className="grid gap-1 border-t border-gray-300 bg-white p-2">
          {title || title === "" ? (
            <input
              className="truncate border-none bg-transparent p-0 text-xs font-semibold text-[#000000E6] outline-none focus:ring-0"
              value={title}
              onChange={(e) => {
                setValue("title", e.currentTarget.value);
                setValue("proxy", true);
              }}
            />
          ) : (
            <div className="mb-1 h-5 w-full rounded-md bg-gray-200" />
          )}
          {hostname ? (
            <p className="text-[9px] text-[#00000099]">{hostname}</p>
          ) : (
            <div className="mb-1 h-4 w-24 rounded-md bg-gray-200" />
          )}
        </div>
      </div>
    </div>
  );
}

function XOGPreview({ title, hostname, children }: OGPreviewProps) {
  const hasTitle = title || title === "";
  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-gray-300">
        {children}
        <div className="absolute bottom-2 left-0 w-full px-2">
          <div
            className={cn(
              "w-fit max-w-full rounded px-1.5 py-px",
              hasTitle ? "bg-black/[0.77]" : "bg-gray-200",
            )}
          >
            {hasTitle ? (
              <span className="block max-w-sm truncate text-xs text-white">
                {title}
              </span>
            ) : (
              <div className="h-4 w-32" />
            )}
          </div>
        </div>
      </div>
      {hostname ? (
        <p className="mt-1 text-xs text-[#606770]">From {hostname}</p>
      ) : (
        <div className="mt-1 h-4 w-24 rounded-md bg-gray-200" />
      )}
    </div>
  );
}
