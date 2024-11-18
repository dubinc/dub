"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerProps, ProgramProps } from "@/lib/types";
import { BlurImage, Popover, useScrollProgress } from "@dub/ui";
import { Check2, Gear } from "@dub/ui/src/icons";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

const LINKS = ({ partnerId }: { partnerId: string }) => [
  {
    name: "Settings",
    icon: Gear,
    href: `/${partnerId}/settings`,
  },
  // {
  //   name: "Help center",
  //   icon: HelpCircle,
  //   href: "https://dub.co/help",
  //   target: "_blank",
  // },
  // {
  //   name: "Switch to Business Hub",
  //   icon: Connections3,
  //   href: APP_DOMAIN,
  // },
];

export function PartnerProgramDropdown() {
  const { programId } = useParams() as {
    programId?: string;
  };

  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  const selectedProgram = useMemo(() => {
    const program = programEnrollments?.find(
      (programEnrollment) => programEnrollment.programId === programId,
    );
    return programId && program
      ? {
          ...program.program,
          logo:
            program.program.logo ||
            `${DICEBEAR_AVATAR_URL}${program.program.name}`,
        }
      : undefined;
  }, [programId, programEnrollments]);

  const [openPopover, setOpenPopover] = useState(false);

  if (!partner || (programId && !programEnrollments)) {
    return <PartnerDropdownPlaceholder />;
  }

  return (
    <div>
      <Popover
        content={
          <ScrollContainer>
            {programEnrollments && programEnrollments.length > 0 && (
              <div className="border-b border-neutral-200 p-2">
                <ProgramList
                  partner={partner}
                  selectedProgram={selectedProgram}
                  programs={programEnrollments
                    .filter(
                      (programEnrollment) =>
                        programEnrollment.status === "approved",
                    )
                    .map((programEnrollment) => programEnrollment.program)}
                  setOpenPopover={setOpenPopover}
                />
              </div>
            )}
            <div className="p-2">
              <Link
                key={partner.id}
                className={cn(
                  "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75",
                  "hover:bg-neutral-200/50 active:bg-neutral-200/80",
                  "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                )}
                href={`/${partner.id}`}
                shallow={false}
                onClick={() => setOpenPopover(false)}
              >
                <BlurImage
                  src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.id}`}
                  width={28}
                  height={28}
                  alt={partner.name}
                  className="size-7 shrink-0 overflow-hidden rounded-full"
                />
                <div>
                  <span className="block truncate text-sm leading-5 text-neutral-900 sm:max-w-[140px]">
                    {partner.name}
                  </span>
                  <div
                    className={cn(
                      "truncate text-xs capitalize leading-tight text-neutral-600",
                    )}
                  >
                    Partner
                  </div>
                </div>
              </Link>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {LINKS({ partnerId: partner.id }).map(
                  ({ name, icon: Icon, href }) => (
                    <Link
                      key={name}
                      href={href}
                      className={cn(
                        "flex items-center gap-x-4 rounded-md px-2.5 py-2 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
                        "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                      )}
                      onClick={() => setOpenPopover(false)}
                    >
                      <Icon className="size-4 text-neutral-500" />
                      <span className="block truncate text-neutral-600">
                        {name}
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </div>
          </ScrollContainer>
        }
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg p-1.5 text-left text-sm transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80 data-[state=open]:bg-neutral-200/80",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
            <BlurImage
              src={
                selectedProgram?.logo ||
                partner.image ||
                `${DICEBEAR_AVATAR_URL}${partner.id}`
              }
              referrerPolicy="no-referrer"
              width={28}
              height={28}
              alt={selectedProgram?.name || partner.name}
              className="h-7 w-7 flex-none shrink-0 overflow-hidden rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selectedProgram?.name || partner.name}
              </div>
              <div
                className={cn(
                  "truncate text-xs capitalize leading-tight text-neutral-600",
                )}
              >
                {selectedProgram ? "Enrolled" : "Partner"}
              </div>
            </div>
          </div>
          <ChevronsUpDown
            className="size-4 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        </button>
      </Popover>
    </div>
  );
}

function PartnerDropdownPlaceholder() {
  return (
    <div className="flex w-full animate-pulse items-center gap-x-1.5 rounded-lg p-1.5">
      <div className="size-7 animate-pulse rounded-full bg-gray-200" />
      <div className="mb-px mt-0.5 h-8 w-28 grow animate-pulse rounded-md bg-gray-200" />
      <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
    </div>
  );
}

function ScrollContainer({ children }: PropsWithChildren) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={updateScrollProgress}
        className="relative max-h-80 w-full space-y-0.5 overflow-auto rounded-lg bg-white text-base sm:w-64 sm:text-sm"
      >
        {children}
      </div>
      {/* Bottom scroll fade */}
      <div
        className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}

function ProgramList({
  partner,
  programs,
  selectedProgram,
  setOpenPopover,
}: {
  partner: PartnerProps;
  programs: ProgramProps[];
  selectedProgram?: ProgramProps;
  setOpenPopover: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const href = useCallback(
    (id: string) =>
      selectedProgram
        ? pathname?.replace(selectedProgram.id, id).split("?")[0] || "/"
        : `/${partner.id}/${id}`,
    [pathname, selectedProgram, partner],
  );

  return (
    <div>
      <div className="flex items-center justify-between pb-1">
        <p className="px-1 text-xs font-medium text-neutral-500">Programs</p>
      </div>
      <div className="flex flex-col gap-0.5">
        {programs.map(({ id, name, logo }) => {
          const isActive = selectedProgram?.id === id;
          return (
            <Link
              key={id}
              className={cn(
                "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75",
                "hover:bg-neutral-200/50 active:bg-neutral-200/80",
                "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                isActive && "bg-neutral-200/50",
              )}
              href={href(id)}
              shallow={false}
              onClick={() => setOpenPopover(false)}
            >
              <BlurImage
                src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
                width={28}
                height={28}
                alt={id}
                className="size-7 shrink-0 overflow-hidden rounded-full"
              />
              <div>
                <span className="block truncate text-sm leading-5 text-neutral-900 sm:max-w-[140px]">
                  {name}
                </span>
                <div
                  className={cn(
                    "truncate text-xs capitalize leading-tight text-neutral-600",
                  )}
                >
                  Program
                </div>
              </div>
              {selectedProgram?.id === id ? (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                  <Check2 className="size-4" aria-hidden="true" />
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
