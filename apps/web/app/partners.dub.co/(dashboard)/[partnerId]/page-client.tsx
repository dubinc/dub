"use client";

import { ProgramProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { BlurImage, MaxWidthWrapper } from "@dub/ui";
import { CircleDollar, GridIcon } from "@dub/ui/src/icons";
import { DICEBEAR_AVATAR_URL, fetcher } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PartnersDashboardPageClient() {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  const { data: programs, error } = useSWR<ProgramProps[]>(
    `/api/partners/${partnerId}/programs`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <MaxWidthWrapper>
      {programs === undefined ? (
        error ? (
          <div className="mt-8 text-center text-sm text-neutral-500">
            Failed to load programs
          </div>
        ) : (
          <ProgramsListSkeleton />
        )
      ) : programs.length > 0 ? (
        <ProgramsList programs={programs} />
      ) : (
        <AnimatedEmptyState
          title="No programs found"
          description="Enroll in programs to start earning."
          cardContent={
            <>
              <GridIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          learnMoreHref="https://dub.co/help/article/dub-conversions"
        />
      )}
    </MaxWidthWrapper>
  );
}

function ProgramsList({ programs }: { programs: ProgramProps[] }) {
  const { partnerId } = useParams() as {
    partnerId?: string;
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => (
        <Link
          key={program.id}
          href={`/${partnerId}/${program.id}`}
          className="flex items-center gap-4 rounded-md border border-neutral-300 p-4 transition-colors hover:bg-neutral-50"
        >
          <BlurImage
            width={96}
            height={96}
            src={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-12 rounded-full"
          />
          <span className="text-base font-medium text-neutral-900">
            {program.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ProgramsListSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(2)].map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 rounded-md border border-neutral-300 p-4"
        >
          <div className="size-12 rounded-full bg-neutral-200" />
          <div className="h-6 w-24 min-w-0 rounded-md bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}
