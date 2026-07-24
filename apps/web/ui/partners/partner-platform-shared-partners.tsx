import useWorkspace from "@/lib/swr/use-workspace";
import {
  PartnerProgramSharedPlatformProps,
  PartnerSharedPlatformProps,
} from "@/lib/types";
import { ArrowUpRight2, StatusBadge } from "@dub/ui";
import { Duplicate } from "@dub/ui/icons";
import { cn, pluralize } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { PartnerAvatar } from "./partner-avatar";
import { PartnerStatusBadges } from "./partner-status-badges";

type PartnerPlatformSharedPartnersProps =
  | {
      // admin: partners across the whole network, linking to the network page
      variant?: "admin";
      sharedPartners: PartnerSharedPlatformProps["partners"];
    }
  | {
      // program: partners enrolled in the program, linking to their status-specific view
      variant: "program";
      sharedPartners: PartnerProgramSharedPlatformProps["partners"];
    };

export function PartnerPlatformSharedPartners(
  props: PartnerPlatformSharedPartnersProps,
) {
  const { sharedPartners } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className="border-subtle mx-2 rounded-b-lg border border-t-0 bg-white px-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex h-9 w-full items-center justify-between gap-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Duplicate className="size-3.5 shrink-0 text-neutral-500" />
          <span className="truncate text-xs font-medium text-neutral-600">
            Added by {sharedPartners.length} other{" "}
            {pluralize("partner", sharedPartners.length)}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-neutral-400 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className={cn(
            "flex flex-col",
            // program rows carry their own vertical padding for the hover state
            props.variant === "program"
              ? "gap-0.5 pb-2 pt-0.5"
              : "gap-2.5 pb-3 pt-1",
          )}
        >
          {props.variant === "program"
            ? props.sharedPartners.map((partner) => (
                <ProgramSharedPartner key={partner.id} partner={partner} />
              ))
            : props.sharedPartners.map((partner) => (
                <SharedPartner key={partner.id} partner={partner} />
              ))}
        </div>
      )}
    </div>
  );
}

function SharedPartner({
  partner,
}: {
  partner: PartnerSharedPlatformProps["partners"][number];
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <PartnerAvatar partner={partner} className="size-3.5" />
        <span className="min-w-0 truncate text-xs font-medium text-neutral-700">
          {partner.name}
        </span>
      </div>
      <a
        href={`/partners/network?partnerId=${partner.id}&search=${encodeURIComponent(partner.email ?? "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-content-subtle hover:text-content-default shrink-0 text-xs font-medium"
      >
        View
      </a>
    </div>
  );
}

const getPartnerDetailsUrl = ({
  workspaceSlug,
  partnerId,
  status,
}: {
  workspaceSlug: string;
  partnerId: string;
  status: ProgramEnrollmentStatus;
}) => {
  switch (status) {
    case "pending":
      return `/${workspaceSlug}/program/partners/applications?partnerId=${partnerId}`;
    case "rejected":
      return `/${workspaceSlug}/program/partners/applications/rejected?partnerId=${partnerId}`;
    default:
      return `/${workspaceSlug}/program/partners/${partnerId}`;
  }
};

function ProgramSharedPartner({
  partner,
}: {
  partner: PartnerProgramSharedPlatformProps["partners"][number];
}) {
  const { slug: workspaceSlug } = useWorkspace();
  const badge = PartnerStatusBadges[partner.status];

  return (
    <a
      href={getPartnerDetailsUrl({
        workspaceSlug: workspaceSlug!,
        partnerId: partner.id,
        status: partner.status,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="group -mx-1.5 flex items-center justify-between gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-neutral-50"
    >
      <div className="flex min-w-0 items-center gap-2">
        <PartnerAvatar partner={partner} className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate text-xs font-medium text-neutral-700">
          {partner.name}
        </span>
        {partner.status !== "approved" && badge && (
          <StatusBadge
            icon={null}
            variant={badge.variant}
            size="sm"
            className="shrink-0"
          >
            {badge.label}
          </StatusBadge>
        )}
      </div>
      <div className="text-content-subtle group-hover:text-content-default flex shrink-0 items-center text-xs font-medium">
        View
        <ArrowUpRight2 className="ml-0 size-0 opacity-0 transition-[width,margin,opacity] duration-150 group-hover:ml-1 group-hover:size-3.5 group-hover:opacity-100" />
      </div>
    </a>
  );
}
