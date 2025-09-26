import { buttonVariants, Copy, useCopyToClipboard } from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode, RefObject } from "react";
import { toast } from "sonner";

export function PreviewWindow({
  url,
  scrollRef,
  showViewButton = true,
  className,
  contentClassName,
  overlay,
  controls,
  children,
}: PropsWithChildren<{
  url: string;
  scrollRef?: RefObject<HTMLDivElement>;
  showViewButton?: boolean;
  className?: string;
  contentClassName?: string;
  overlay?: ReactNode;
  controls?: ReactNode;
}>) {
  const [_, copyToClipboard] = useCopyToClipboard();

  return (
    <div
      className={cn(
        "relative flex size-full flex-col overflow-hidden rounded-t-xl border-x border-t border-neutral-200 bg-white shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-2.5">
        <div className="hidden grow basis-0 items-center gap-2 sm:flex">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="size-2 rounded-full border border-neutral-300 bg-neutral-200"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            copyToClipboard(url, {
              onSuccess: () => {
                toast.success("Copied to clipboard");
              },
            })
          }
          className="group flex min-w-0 max-w-xs grow items-center justify-center rounded-lg bg-neutral-100 px-4 py-1.5"
        >
          <div className="relative min-w-0">
            <span className="text-content-emphasis block truncate text-xs font-medium">
              {getPrettyUrl(url)}
            </span>
            <div className="absolute inset-y-0 left-full ml-1 flex translate-y-0.5 items-center opacity-0 transition-[opacity,transform] duration-100 group-hover:translate-y-0 group-hover:opacity-100">
              <Copy className="size-3" />
            </div>
          </div>
        </button>
        <div className="flex grow basis-0 justify-end gap-2">
          {controls}
          {showViewButton && (
            <Link
              href={url}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 w-fit items-center gap-1 rounded-md border px-2 text-sm",
              )}
            >
              View
              <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="relative z-0 grow overflow-hidden">
        <div
          className={cn(
            "scrollbar-hide @container relative size-full overflow-y-auto",
            contentClassName,
          )}
          ref={scrollRef}
        >
          {children}
        </div>
        {overlay}
      </div>
    </div>
  );
}
