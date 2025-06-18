import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { ButtonLink } from "@/ui/placeholders/button-link";
import {
  ArrowUpRight,
  Brush,
  Copy,
  InputField,
  Post,
  useCopyToClipboard,
  Window,
} from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

export function OverviewLinks() {
  const { slug } = useWorkspace();
  const { program } = useProgram();

  const [_, copyToClipboard] = useCopyToClipboard();

  const links = useMemo(
    () => [
      {
        icon: Post,
        label: "Landing page",
        href: `${PARTNERS_DOMAIN}/${program?.slug}`,
        disabled: !program?.landerPublishedAt,
      },
      {
        icon: InputField,
        label: "Application page",
        href: `${PARTNERS_DOMAIN}/${program?.slug}/apply`,
        disabled: !program?.landerPublishedAt,
      },
      {
        icon: Window,
        label: "Partner portal",
        href: `${PARTNERS_DOMAIN}`,
        disabled: !program,
      },
    ],
    [slug, program],
  );

  return (
    <ProgramOverviewCard className="py-4">
      <div className="flex justify-between px-4">
        <h2 className="text-content-emphasis text-sm font-medium">
          Program links
        </h2>
        <ButtonLink
          href={`/${slug}/program/branding`}
          variant="secondary"
          className="-mr-1 -mt-1 h-7 px-2 text-sm"
        >
          <Brush className="mr-1.5 size-4 shrink-0" />
          Branding
        </ButtonLink>
      </div>
      <div className="mt-3 flex flex-col px-2">
        {links.map((link) => (
          <div
            key={link.label}
            className={cn(
              "group relative transition-opacity",
              link.disabled && "pointer-events-none opacity-50",
            )}
          >
            <Link
              key={link.label}
              href={link.href}
              target="_blank"
              className={cn(
                "relative flex items-center justify-between gap-2 rounded-lg p-2 pl-3 text-sm font-semibold transition-colors",
                "group-hover:bg-bg-inverted/5 group-hover:active:bg-bg-inverted/10",
              )}
              aria-disabled={link.disabled}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <link.icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{link.label}</span>
                <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
              </div>

              <div className="h-8 w-12" />
            </Link>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(link.href, {
                  onSuccess: () => {
                    toast.success("Copied to clipboard");
                  },
                })
              }
              className={cn(
                "text-content-default bg-bg-inverted/5 absolute right-2 top-1/2 flex h-8 -translate-y-1/2 items-center rounded-lg px-4 transition-[opacity,background-color]",
                "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                "hover:bg-bg-inverted/10 active:bg-bg-inverted/15",
              )}
            >
              <Copy className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ProgramOverviewCard>
  );
}
