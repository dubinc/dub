import useGroups from "@/lib/swr/use-groups";
import useProgram from "@/lib/swr/use-program";
import { GroupWithFormDataProps } from "@/lib/types";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import {
  ArrowUpRight,
  Check,
  Copy,
  InputField,
  Post,
  useCopyToClipboard,
  Window,
} from "@dub/ui";
import { cn, getPrettyUrl, PARTNERS_DOMAIN } from "@dub/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function OverviewLinks() {
  const { program } = useProgram();
  const { groups } = useGroups<GroupWithFormDataProps>({
    query: { includeExpandedFields: true },
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Initialize or reset selection when groups change
  useEffect(() => {
    if (!groups?.length) return;

    // Check if current selection is still valid
    const isCurrentSelectionValid =
      selectedGroupId && groups.some((g) => g.id === selectedGroupId);

    if (!isCurrentSelectionValid) {
      const defaultGroup =
        groups.find((g) => g.slug === "default") || groups[0];
      setSelectedGroupId(defaultGroup.id);
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!groups?.length || !selectedGroupId) return null;
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const showGroupSelector = groups && groups.length > 1;

  const links = useMemo(() => {
    const programSlug = program?.slug;
    const groupSlug = selectedGroup?.slug;
    const isDefault = groupSlug === "default";

    // Build URLs only when we have valid slugs
    const landingPageHref =
      programSlug && groupSlug
        ? isDefault
          ? `${PARTNERS_DOMAIN}/${programSlug}`
          : `${PARTNERS_DOMAIN}/${programSlug}/${groupSlug}`
        : "#";

    const applicationHref =
      programSlug && groupSlug
        ? isDefault
          ? `${PARTNERS_DOMAIN}/${programSlug}/apply`
          : `${PARTNERS_DOMAIN}/${programSlug}/${groupSlug}/apply`
        : "#";

    const partnerPortalHref = programSlug
      ? `${PARTNERS_DOMAIN}/programs/${programSlug}`
      : "#";

    return [
      {
        icon: Post,
        label: "Landing page",
        href: landingPageHref,
        disabled: !selectedGroup?.landerPublishedAt || !programSlug,
      },
      {
        icon: InputField,
        label: "Application form",
        href: applicationHref,
        disabled: !selectedGroup?.applicationFormPublishedAt || !programSlug,
      },
      {
        icon: Window,
        label: "Partner portal",
        href: partnerPortalHref,
        disabled: !program,
      },
    ];
  }, [program, selectedGroup]);

  return (
    <ProgramOverviewCard className="py-4">
      <div className="flex justify-between px-4">
        <h2 className="text-content-emphasis text-sm font-medium">
          Program links
        </h2>
        {showGroupSelector && (
          <GroupSelector
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            buttonProps={{
              className:
                "h-7 -mr-1 -mt-1 max-w-[160px] px-2 text-sm justify-between",
            }}
            labelProps={{
              className: "truncate text-sm font-medium",
            }}
            popoverProps={{
              contentClassName: "min-w-[180px]",
            }}
          />
        )}
      </div>
      <div className="mt-3 flex flex-col px-2">
        {links.map((link) => {
          const [copied, copyToClipboard] = useCopyToClipboard();
          return (
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
                {...(link.disabled && { "aria-disabled": true, tabIndex: -1 })}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="border-border-default rounded-md border p-2">
                    <link.icon className="size-4 shrink-0" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 truncate">{link.label}</span>
                      <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100 [&_*]:stroke-2" />
                    </div>
                    <span className="text-content-subtle text-xs font-normal">
                      {getPrettyUrl(link.href)}
                    </span>
                  </div>
                </div>
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
                  "text-content-default bg-bg-inverted/5 absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-[opacity,background-color]",
                  "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                  "hover:bg-bg-inverted/10 active:bg-bg-inverted/15",
                )}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </ProgramOverviewCard>
  );
}
