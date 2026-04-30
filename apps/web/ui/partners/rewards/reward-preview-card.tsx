import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Table, useTable } from "@dub/ui";
import { cn, nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWatch } from "react-hook-form";
import { REWARD_EVENTS } from "../constants";
import { ProgramRewardDescription } from "../program-reward-description";
import {
  getRewardPayload,
  useAddEditRewardForm,
} from "./add-edit-reward-sheet";
import { getRewardQuality, RewardQualityIndicator } from "./reward-quality";

export function RewardPreviewCard() {
  const { control } = useAddEditRewardForm();

  const data = useWatch({ control });

  let reward: ReturnType<typeof getRewardPayload> | null = null;
  try {
    reward = getRewardPayload({ data: data as any });
  } catch (error) {
    return null;
  }

  const Icon = REWARD_EVENTS[reward.event].icon;
  const type = data.type ?? reward.type;
  const hasConditions = !!data.modifiers?.length;
  const quality = getRewardQuality({
    event: reward.event,
    type,
    amountInCents:
      type === "flat" &&
      data.amountInCents != null &&
      !Number.isNaN(data.amountInCents)
        ? data.amountInCents * 100
        : null,
    amountInPercentage:
      type === "percentage" &&
      data.amountInPercentage != null &&
      !Number.isNaN(data.amountInPercentage)
        ? data.amountInPercentage
        : null,
    maxDuration: data.maxDuration,
  });

  return (
    <div className="border-border-subtle bg-bg-muted rounded-xl border shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-content-emphasis flex items-center gap-2.5 text-sm font-semibold">
          Reward preview
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">
            {hasConditions ? "Base reward quality" : "Reward quality"}
          </span>
          <RewardQualityIndicator
            event={reward.event}
            quality={quality}
            tooltipFooter={
              hasConditions ? "Based on default reward only" : undefined
            }
          />
        </div>
      </div>

      <div className="border-border-subtle bg-bg-default -mx-px rounded-xl border-x border-t p-4">
        <div className="text-content-default flex items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <span className="text-sm font-normal">
            <ProgramRewardDescription reward={reward} />
          </span>
        </div>
      </div>
    </div>
  );
}

function PartnersCompactTable({
  partners,
  partnersCount,
  groupId,
}: {
  partners?: EnrolledPartnerProps[];
  partnersCount: number;
  groupId: string;
}) {
  const { slug } = useParams<{ slug: string }>();

  const { table, ...tableProps } = useTable({
    data: partners || [],
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <PartnerAvatar partner={row.original} className="size-6" />
            <span className="truncate text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
        size: 180,
        minSize: 180,
        maxSize: 180,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 160,
        minSize: 160,
        maxSize: 160,
      },
    ],
    thClassName: "border-l-0",
    tdClassName: (columnId: string) =>
      cn("border-l-0", columnId !== "menu" && "max-w-0 truncate"),
    resourceName: (p: boolean) => `partner${p ? "s" : ""}`,
    rowCount: partners?.length || 0,
  });

  return (
    <div className="relative">
      {partners?.length ? (
        <>
          <Table
            {...tableProps}
            table={table}
            containerClassName="border"
            scrollWrapperClassName="overflow-x-hidden"
          />
          {partnersCount > 10 && (
            <div className="mt-2 flex justify-end">
              <Link
                href={`/${slug}/program/partners?groupId=${groupId}`}
                target="_blank"
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 w-fit rounded-lg px-2.5"
                  text="View all"
                />
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="text-content-muted flex h-24 items-center justify-center text-sm">
          No partners found.
        </div>
      )}
    </div>
  );
}

function PartnerPreviewOrCount({
  previewPartners,
  partnersCount,
  isExpanded,
}: {
  previewPartners: EnrolledPartnerProps[];
  partnersCount: number;
  isExpanded: boolean;
}) {
  const showAvatars = !isExpanded && partnersCount > 0;

  return (
    <span className="relative">
      <span
        className={cn(
          "transition-[transform,opacity] duration-200",
          showAvatars && "pointer-events-none -translate-y-0.5 opacity-0",
        )}
      >
        <strong className="font-semibold">
          {nFormatter(partnersCount, { full: true })}
        </strong>{" "}
        {partnersCount && pluralize("partner", partnersCount)}
      </span>

      <span
        className={cn(
          "absolute left-2 top-1/2 inline-flex min-w-full -translate-y-1/2 items-center align-text-top transition-[transform,opacity] duration-200",
          !showAvatars && "pointer-events-none translate-y-0.5 opacity-0",
        )}
      >
        {previewPartners.map((partner) => (
          <PartnerAvatar
            key={partner.id}
            partner={partner}
            className="-ml-1.5 size-[1.125rem] border border-white"
          />
        ))}
        {partnersCount > 3 && (
          <span className="text-content-subtle ml-1 text-xs">
            +{nFormatter(partnersCount - 3, { full: true })}
          </span>
        )}
      </span>
    </span>
  );
}
