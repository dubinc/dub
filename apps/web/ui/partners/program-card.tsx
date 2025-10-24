import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { ProgramEnrollmentProps } from "@/lib/types";
import { BlurImage, Link4, MiniAreaChart } from "@dub/ui";
import { formatDate, getPrettyUrl, OG_AVATAR_URL } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { useMemo } from "react";

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
            <Link4 className="size-3" />
            <span className="text-sm font-medium">
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
          {status === "pending" ? (
            `Applied ${formatDate(createdAt)}`
          ) : statusDescription ? (
            <p>
              {` ${statusDescription} `}
              <Link
                href={`/messages/${program.slug}`}
                className="text-neutral-400 underline decoration-dotted underline-offset-2 hover:text-neutral-700"
              >
                Reach out to the {program.name} team
              </Link>{" "}
              if you have any questions.
            </p>
          ) : null}
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
  });

  const chartData = useMemo(
    () =>
      timeseries?.map((d) => ({
        date: new Date(d.start),
        value: d.earnings,
      })),
    [timeseries],
  );

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
