import { cn, resizeImage } from "@dub/utils";
import { UploadCloud } from "lucide-react";
import { DragEvent, ReactNode, useId, useState } from "react";
import { LoadingCircle, LoadingSpinner } from "./icons";

import { cva, VariantProps } from "class-variance-authority";

const imageUploadVariants = cva(
  "group relative isolate flex aspect-[1200/630] w-full flex-col items-center justify-center overflow-hidden bg-white transition-all hover:bg-gray-50",
  {
    variants: {
      variant: {
        default: "rounded-md border border-gray-300 shadow-sm",
        plain: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type ImageUploadProps = {
  src: string | null;
  onChange?: (src: string) => void;
  className?: string;
  iconClassName?: string;

  /**
   * Whether to display a loading spinner
   */
  loading?: boolean;

  /**
   * Whether to allow clicking on the area to upload
   */
  clickToUpload?: boolean;

  /**
   * Whether to show instruction overlay when hovered
   */
  showHoverOverlay?: boolean;

  /**
   * Content to display below the upload icon (null to only display the icon)
   */
  content?: ReactNode | null;

  /**
   * Desired resolution to suggest and optionally resize to
   */
  targetResolution?: { width: number; height: number };

  /**
   * Whether to automatically resize the uploaded image to the target resolution
   */
  resize?: boolean;

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
} & VariantProps<typeof imageUploadVariants>;

export function ImageUpload({
  src,
  onChange,
  variant,
  className,
  iconClassName,
  loading = false,
  clickToUpload = true,
  showHoverOverlay = true,
  content,
  targetResolution = { width: 1200, height: 630 },
  resize = true,
  accessibilityLabel = "Image upload",
}: ImageUploadProps) {
  const inputId = useId();

  const [resizing, setResizing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const onImageChange = async (
    e: React.ChangeEvent<HTMLInputElement> | DragEvent,
  ) => {
    const file =
      "dataTransfer" in e
        ? e.dataTransfer.files && e.dataTransfer.files[0]
        : e.target.files && e.target.files[0];
    if (!file) return;

    if (resize) {
      setResizing(true);

      onChange?.(await resizeImage(file, { ...targetResolution, quality: 1 }));

      // Delay to prevent flickering
      setTimeout(() => {
        setResizing(false);
      }, 500);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onChange?.(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <label
      htmlFor={inputId}
      className={cn(
        imageUploadVariants({ variant }),
        clickToUpload && "cursor-pointer",
        className,
      )}
    >
      {loading && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center rounded-[inherit] bg-white">
          <LoadingCircle />
        </div>
      )}
      <div
        className="absolute inset-0 z-[5]"
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
          onImageChange(e);
          setDragActive(false);
        }}
      />
      <div
        className={cn(
          "absolute inset-0 z-[3] flex flex-col items-center justify-center rounded-[inherit] bg-white transition-all",
          dragActive &&
            "cursor-copy border-2 border-black bg-gray-50 opacity-100",
          src
            ? cn("opacity-0", showHoverOverlay && "group-hover:opacity-100")
            : "group-hover:bg-gray-50",
        )}
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
              className={cn(
                "h-7 w-7 text-gray-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95",
                dragActive ? "scale-110" : "scale-100",
                iconClassName,
              )}
            />
            {content !== null && (
              <div className="mt-2 text-center text-sm text-gray-500">
                {content ?? (
                  <>
                    <p>
                      Drag and drop {clickToUpload && "or click"} to upload.
                    </p>
                    <p className="mt-2">
                      Recommended: {targetResolution.width} x{" "}
                      {targetResolution.height} pixels
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}
        <span className="sr-only">{accessibilityLabel}</span>
      </div>
      {src && (
        <img
          src={src}
          alt="Preview"
          className="h-full w-full rounded-[inherit] object-cover"
        />
      )}
      {clickToUpload && (
        <div className="sr-only mt-1 flex shadow-sm">
          <input
            id={inputId}
            name="image"
            type="file"
            accept="image/*"
            onChange={onImageChange}
          />
        </div>
      )}
    </label>
  );
}
