"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getProgramApplicationRejectionReasonLabel } from "@/lib/partners/program-application-rejection";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { ProgramEnrollmentProps } from "@/lib/types";
import {
  BlurImage,
  CalendarIcon,
  CircleQuestion,
  DynamicTooltipWrapper,
  Link4,
  MiniAreaChart,
  Note,
} from "@dub/ui";
import { formatDate, getPrettyUrl, OG_AVATAR_URL } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";

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
    <div className="flex w-full min-w-0 max-w-[min(100vw-2rem,17.5rem)] flex-col gap-2 p-3 pb-4 text-left">
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

function ProgramCardNonApprovedStatus({
  programEnrollment,
  statusDescription,
}: {
  programEnrollment: ProgramEnrollmentProps;
  statusDescription: string | undefined;
}) {
  const router = useRouter();
  const { status, createdAt, program, application } = programEnrollment;

  if (status === "pending") {
    return `Applied ${formatDate(createdAt)}`;
  }

  if (status === "rejected") {
    const tipContent = rejectedApplicationTooltipContent(application);
    const body = <>{statusDescription} You can re-apply in 30 days.</>;

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

    return body;
  }

  if (statusDescription) {
    return (
      <p>
        {statusDescription}{" "}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/messages/${program.slug}`);
          }}
          className="text-neutral-400 underline decoration-dotted underline-offset-2 hover:text-neutral-700"
        >
          Reach out to the {program.name} team
        </button>{" "}
        if you have any questions.
      </p>
    );
  }

  return null;
}

export function ProgramCard({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program, status, createdAt, group } = programEnrollment;

  const defaultLink = programEnrollment.links?.[0];

  const statusDescriptions = {
    banned: "You're banned from this program.",
    rejected: "Your application has been rejected.",
    deactivated: "Your partnership has been deactivated.",
  };
  const statusDescription = statusDescriptions[status];

  return (
    <Link
      href={`/programs/${program.slug}`}
      className="hover:drop-shadow-card-hover flex h-full flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-[filter]"
    >
      <div>
        <BlurImage
          width={96}
          height={96}
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-8 rounded-full border border-black/10"
        />
        <div className="mt-3 flex flex-col">
          <span className="text-base font-semibold text-neutral-800">
            {program.name}
          </span>
          <div className="flex items-center gap-1 text-neutral-500">
            <Link4 className="size-3 shrink-0" />
            <span className="min-w-0 truncate text-sm font-medium">
              {getPrettyUrl(
                constructPartnerLink({
                  group,
                  link: defaultLink,
                }),
              ) || program.domain}
            </span>
          </div>
        </div>
      </div>
      {status === "approved" ? (
        <ProgramCardEarnings programEnrollment={programEnrollment} />
      ) : (
        <div className="mt-4 flex h-20 items-center justify-center text-balance rounded-md border border-neutral-200 bg-neutral-50 p-5 text-center text-sm text-neutral-500">
          <ProgramCardNonApprovedStatus
            programEnrollment={programEnrollment}
            statusDescription={statusDescription}
          />
        </div>
      )}
    </Link>
  );
}

function ProgramCardEarnings({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { program, totalCommissions } = programEnrollment;

  const { data: timeseries } = usePartnerEarningsTimeseries({
    programId: program.id,
    interval: "1y",
    enabled: totalCommissions > 0,
  } as Parameters<typeof usePartnerEarningsTimeseries>[0]);

  const chartData = useMemo(() => {
    if (totalCommissions === 0) {
      // Generate dummy data (straight line at 0) for the past year
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // Generate 12 data points (monthly)
      const dummyData: { date: Date; value: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(oneYearAgo);
        date.setMonth(oneYearAgo.getMonth() + i);
        dummyData.push({
          date,
          value: 0,
        });
      }
      return dummyData;
    }

    return (
      timeseries?.map((d) => ({
        date: new Date(d.start),
        value: d.earnings,
      })) ?? []
    );
  }, [timeseries, totalCommissions]);

  return (
    <div className="mt-4 grid grid-cols-[min-content,minmax(0,1fr)] gap-4 rounded-md border border-neutral-200 bg-neutral-50">
      <div className="py-3 pl-4">
        <div className="whitespace-nowrap text-sm text-neutral-500">
          Earnings
        </div>
        <NumberFlow
          className="text-xl font-medium text-neutral-800"
          value={totalCommissions / 100}
          format={{
            notation: totalCommissions > 100000 ? "compact" : "standard",
            style: "currency",
            currency: "USD",
            // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
            trailingZeroDisplay: "stripIfInteger",
          }}
        />
      </div>
      {chartData && (
        <div className="relative h-full px-3">
          <MiniAreaChart data={chartData} padding={{ top: 16, bottom: 16 }} />
        </div>
      )}
    </div>
  );
}

export function ProgramCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 p-5">
      <div className="size-8 rounded-full bg-neutral-200" />
      <div className="mt-3 flex flex-col">
        <div className="my-0.5 h-5 w-24 min-w-0 rounded-md bg-neutral-200" />
        <div className="my-0.5 h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
      </div>
      <div className="mt-4 h-[72px] animate-pulse rounded-md bg-neutral-100" />
    </div>
  );
}
