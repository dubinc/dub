"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getProgramApplicationRejectionReasonLabel } from "@/lib/program-applications/program-application-rejection";
import { usePartnerProgramActivity } from "@/lib/swr/use-partner-profile-earnings";
import {
  PartnerProfileProgramEnrollmentProps,
  ProgramEnrollmentProps,
} from "@/lib/types";
import {
  CalendarIcon,
  CircleQuestion,
  DynamicTooltipWrapper,
  Link4,
  MiniAreaChart,
  Note,
} from "@dub/ui";
import {
  cn,
  formatDate,
  getPrettyUrl,
  STANDARD_REAPPLICATION_DAYS,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, type SyntheticEvent } from "react";
import { ProgramLogo } from "./program-logo";

function RejectionTooltipRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex w-full items-start gap-2">
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase leading-[14px] tracking-[0.2px] text-neutral-800">
          {label}
        </p>
        <p
          className={
            valueClassName ??
            "mt-0.5 text-xs font-normal leading-4 tracking-[-0.24px] text-neutral-500"
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function rejectedApplicationTooltipContent(
  application: ProgramEnrollmentProps["application"],
): ReactNode | null {
  if (!application) {
    return null;
  }

  const reasonLabel = getProgramApplicationRejectionReasonLabel(
    application.rejectionReason,
  );
  const note = application.rejectionNote?.trim();
  const reviewedAt = application.reviewedAt;

  if (!reasonLabel && !note && !reviewedAt) {
    return null;
  }

  return (
    <div className="flex w-full min-w-0 max-w-[min(100vw-2rem,17.5rem)] flex-col gap-2 p-3 text-left">
      {reviewedAt ? (
        <RejectionTooltipRow
          icon={<CalendarIcon className="size-4 shrink-0" aria-hidden />}
          label="Reviewed"
          value={formatDate(reviewedAt)}
        />
      ) : null}
      {reasonLabel ? (
        <RejectionTooltipRow
          icon={<CircleQuestion className="size-4 shrink-0" aria-hidden />}
          label="Reason"
          value={reasonLabel}
        />
      ) : null}
      {note ? (
        <RejectionTooltipRow
          icon={<Note className="size-4 shrink-0" aria-hidden />}
          label="Notes"
          value={note}
          valueClassName="mt-0.5 whitespace-pre-wrap text-xs font-reg leading-4 tracking-[-0.24px] text-neutral-500"
        />
      ) : null}
    </div>
  );
}

// statuses that keep the earnings on the card
const EARNINGS_STATUSES = ["approved", "banned", "deactivated", "archived"];

export function ProgramCard({
  programEnrollment,
}: {
  programEnrollment: PartnerProfileProgramEnrollmentProps;
}) {
  const { program, status, group, totalCommissions } = programEnrollment;

  const defaultLink = programEnrollment.links?.[0];

  return (
    <Link
      href={`/programs/${program.slug}`}
      className="hover:drop-shadow-card-hover flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 transition-[filter]"
    >
      <ProgramLogo program={program} className="size-8" />
      <span className="mt-3 text-base font-semibold text-neutral-800">
        {program.name}
      </span>
      {EARNINGS_STATUSES.includes(status) && (
        <NumberFlow
          className={cn(
            "text-base font-medium",
            totalCommissions > 0 ? "text-neutral-800" : "text-neutral-500",
          )}
          value={totalCommissions / 100}
          format={{
            notation: totalCommissions > 100000 ? "compact" : "standard",
            style: "currency",
            currency: "USD",
            // @ts-ignore - trailingZeroDisplay is a valid option but TS is outdated
            trailingZeroDisplay: "stripIfInteger",
          }}
        />
      )}
      {status === "approved" ? (
        <div className="mt-auto flex flex-col gap-4 pt-4">
          <ProgramCardActivity programId={programEnrollment.programId} />
          {defaultLink && (
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Link4 className="size-3 shrink-0" />
              <span className="min-w-0 truncate text-sm font-medium">
                {getPrettyUrl(
                  constructPartnerLink({ group, link: defaultLink }),
                )}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex grow items-center justify-center rounded-lg bg-neutral-50 p-5 text-center text-sm text-neutral-500">
          <ProgramCardStatus programEnrollment={programEnrollment} />
        </div>
      )}
    </Link>
  );
}

function ProgramCardStatus({
  programEnrollment,
}: {
  programEnrollment: PartnerProfileProgramEnrollmentProps;
}) {
  const router = useRouter();
  const { status, createdAt, program, application, reapplicationTimeframe } =
    programEnrollment;

  if (status === "pending") {
    return `Applied ${formatDate(createdAt, { month: "short" })}`;
  }

  if (status === "rejected") {
    const tipContent = rejectedApplicationTooltipContent(application);
    const body = (
      <>
        Your application has been{" "}
        <span className="font-semibold text-neutral-700">rejected</span>.
        <br />
        {reapplicationTimeframe === "never"
          ? "You cannot re-apply to this program."
          : `You can re-apply in ${STANDARD_REAPPLICATION_DAYS} days.`}
      </>
    );

    if (tipContent) {
      return (
        <DynamicTooltipWrapper
          tooltipProps={{
            content: tipContent,
            side: "top",
          }}
        >
          <div className="cursor-help underline decoration-neutral-400 decoration-dotted underline-offset-2">
            {body}
          </div>
        </DynamicTooltipWrapper>
      );
    }

    return <div>{body}</div>;
  }

  const inactiveDescriptions: Partial<Record<typeof status, ReactNode>> = {
    banned: (
      <>
        You&apos;ve been{" "}
        <span className="font-semibold text-neutral-700">banned</span> from this
        program.
      </>
    ),
    deactivated: (
      <>
        Your partnership has been{" "}
        <span className="font-semibold text-neutral-700">deactivated</span>.
      </>
    ),
    archived: (
      <>
        Your partnership has been{" "}
        <span className="font-semibold text-neutral-700">archived</span>.
      </>
    ),
  };

  const description = inactiveDescriptions[status];

  if (!description) {
    return null;
  }

  // the card is a link, so stop the click from opening the program page
  const openMessages = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/messages/${program.slug}`);
  };

  return (
    <p>
      {description}
      <br />
      {/* a span, because a button cannot wrap inline with the text around it */}
      <span
        role="button"
        tabIndex={0}
        onClick={openMessages}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openMessages(e);
        }}
        className="cursor-pointer underline decoration-dotted underline-offset-2 hover:text-neutral-700"
      >
        Reach out to the {program.name} team
      </span>{" "}
      if you have any questions.
    </p>
  );
}

function ProgramCardActivity({ programId }: { programId: string }) {
  const chartData = usePartnerProgramActivity(programId);

  return (
    <div className="-mx-5 h-16">
      {chartData && (
        <MiniAreaChart
          data={chartData}
          padding={{ top: 8, bottom: 8, right: 8 }}
          fadeIn
          showEndDot
        />
      )}
    </div>
  );
}

export function ProgramCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5">
      <div className="size-8 rounded-full bg-neutral-200" />
      <div className="mt-3 h-5 w-24 rounded-md bg-neutral-200" />
      <div className="mt-1 h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
      <div className="mt-4 h-16 animate-pulse rounded-md bg-neutral-100" />
      <div className="mt-4 h-4 w-32 animate-pulse rounded-md bg-neutral-100" />
    </div>
  );
}
