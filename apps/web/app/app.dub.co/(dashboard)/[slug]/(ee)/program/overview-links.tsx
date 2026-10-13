import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupWithProgramProps } from "@/lib/types";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import { ButtonLink } from "@/ui/placeholders/button-link";
import {
  ArrowUpRight,
  Brush,
  Check,
  Copy,
  EyeSlash,
  InputField,
  Post,
  Tooltip,
  useCopyToClipboard,
  Window,
} from "@dub/ui";
import { cn, getPrettyUrl, PARTNERS_DOMAIN } from "@dub/utils";
import Link from "next/link";
import { ComponentType, SVGProps, useMemo } from "react";
import { toast } from "sonner";

export function OverviewLinks() {
  const { slug } = useWorkspace();
  const { program, loading: programLoading } = useProgram();
  const { group: defaultGroup, loading: defaultGroupLoading } =
    useGroup<GroupWithProgramProps>({
      groupIdOrSlug: "default",
      query: { includeExpandedFields: true },
    });

  const links = useMemo(
    () => [
      {
        icon: Post,
        label: "Landing page",
        href: `${PARTNERS_DOMAIN}/${program?.slug}`,
        loading: programLoading || defaultGroupLoading,
        disabled: !defaultGroup?.landerPublishedAt,
        disabledTooltip: unpublishedTooltip(
          "landing page",
          `/${slug}/program/groups/default/branding?tab=landing`,
        ),
      },
      {
        icon: InputField,
        label: "Application form",
        href: `${PARTNERS_DOMAIN}/${program?.slug}/apply`,
        loading: programLoading || defaultGroupLoading,
        disabled: !defaultGroup?.applicationFormPublishedAt,
        disabledTooltip: unpublishedTooltip(
          "application form",
          `/${slug}/program/groups/default/branding?tab=application`,
        ),
      },
      {
        icon: Window,
        label: "Partner portal",
        href: `${PARTNERS_DOMAIN}/programs/${program?.slug}`,
        loading: programLoading,
        disabled: !program,
      },
    ],
    [slug, program, programLoading, defaultGroup, defaultGroupLoading],
  );

  return (
    <ProgramOverviewCard className="rounded-xl">
      <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-3">
        <h2 className="text-content-emphasis text-sm font-semibold">
          Program links
        </h2>
        <ButtonLink
          href={`/${slug}/program/groups/default/branding`}
          variant="secondary"
          className="h-7 px-2.5 text-sm"
        >
          <Brush className="mr-2 size-4 shrink-0" />
          Branding
        </ButtonLink>
      </div>
      <div className="flex flex-col px-2 pb-2">
        {links.map((link) => (
          <ProgramLinkRow key={link.label} {...link} />
        ))}
      </div>
    </ProgramOverviewCard>
  );
}

const unpublishedTooltip = (label: string, href: string) =>
  `Your ${label} is not published yet.\\\nView your [${label}](${href}) to publish.`;

function ProgramLinkRow({
  icon: Icon,
  label,
  href,
  loading,
  disabled,
  disabledTooltip,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  loading: boolean;
  disabled: boolean;
  disabledTooltip?: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  // Avoid flashing the unpublished state before the program and group load
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg p-2 text-sm font-medium">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200">
          <Icon className="size-[18px] shrink-0" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="min-w-0 truncate">{label}</span>
          <div className="my-0.5 h-3 w-40 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <Tooltip content={disabledTooltip} disabled={!disabledTooltip}>
        <div
          tabIndex={0}
          aria-disabled
          className="hover:bg-bg-inverted/5 flex items-center gap-2.5 rounded-lg p-2 text-sm font-medium transition-colors"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200">
            <EyeSlash className="text-content-muted size-[18px] shrink-0" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-content-muted min-w-0 truncate">{label}</span>
            <span className="text-content-muted truncate text-xs font-medium">
              {getPrettyUrl(href)}
            </span>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={href}
        target="_blank"
        className={cn(
          // pr-12 reserves space for the absolutely positioned copy button
          "relative flex items-center justify-between gap-2 rounded-lg p-2 pr-12 text-sm font-medium transition-colors",
          "group-hover:bg-bg-inverted/5 group-hover:active:bg-bg-inverted/10",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200">
            <Icon className="size-[18px] shrink-0" />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate">{label}</span>
              <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
            </div>
            <span className="text-content-muted truncate text-xs font-medium">
              {getPrettyUrl(href)}
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() =>
          copyToClipboard(href, {
            onSuccess: () => {
              toast.success("Copied to clipboard");
            },
          })
        }
        className={cn(
          "text-content-default bg-bg-inverted/5 absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-[opacity,background-color]",
          "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
          "hover:bg-bg-inverted/10 active:bg-bg-inverted/15",
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
