"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { ProgramProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  BlurImage,
  Popover,
  useScrollProgress,
} from "@dub/ui";
import { Check2, Gear, Magnifier } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { Command } from "cmdk";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

const LINKS = [
  {
    name: "Settings",
    icon: Gear,
    href: "/settings",
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
  const { programSlug } = useParams() as { programSlug?: string };

  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  const selectedProgram = useMemo(() => {
    const program = programEnrollments?.find(
      (programEnrollment) => programEnrollment.program.slug === programSlug,
    );

    return programSlug && program
      ? {
          ...program.program,
          logo:
            program.program.logo || `${OG_AVATAR_URL}${program.program.name}`,
          status: program.status,
        }
      : undefined;
  }, [programSlug, programEnrollments]);

  const [openPopover, setOpenPopover] = useState(false);

  if (!partner || (programSlug && !programEnrollments)) {
    return <PartnerDropdownPlaceholder />;
  }

  return (
    <div>
      <Popover
        content={
          <div className="w-full sm:w-auto">
            {programEnrollments && programEnrollments.length > 0 && (
              <div className="border-b border-neutral-200">
                <ProgramList
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
                className={cn(
                  "relative flex w-full items-center gap-x-2 rounded-md px-2 py-2 transition-all duration-75",
                  "hover:bg-neutral-200/50 active:bg-neutral-200/80",
                  "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                )}
                href="/programs"
                shallow={false}
                onClick={() => setOpenPopover(false)}
              >
                <BlurImage
                  src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                  width={40}
                  height={40}
                  alt={partner.name}
                  className="size-5 shrink-0 overflow-hidden rounded-full border border-black/10"
                />
                <span className="block min-w-0 truncate text-sm leading-5 text-neutral-800">
                  {partner.name}
                </span>
              </Link>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {LINKS.map(({ name, icon: Icon, href }) => (
                  <Link
                    key={name}
                    href={href}
                    className={cn(
                      "flex items-center gap-x-2.5 rounded-md px-2.5 py-2 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
                      "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                    )}
                    onClick={() => setOpenPopover(false)}
                  >
                    <Icon className="size-4 text-neutral-500" />
                    <span className="block truncate text-neutral-800">
                      {name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
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
                `${OG_AVATAR_URL}${partner.id}`
              }
              referrerPolicy="no-referrer"
              width={28}
              height={28}
              alt={selectedProgram?.name || partner.name}
              className="size-7 flex-none shrink-0 overflow-hidden rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selectedProgram?.name || partner.name}
              </div>
              {(!selectedProgram || selectedProgram.status === "approved") && (
                <div
                  className={cn(
                    "truncate text-xs capitalize leading-tight text-neutral-600",
                  )}
                >
                  {selectedProgram ? "Enrolled" : "Partner"}
                </div>
              )}
            </div>
          </div>
          <ChevronsUpDown
            className="size-4 shrink-0 text-neutral-400"
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
      <div className="size-7 animate-pulse rounded-full bg-neutral-200" />
      <div className="mb-px mt-0.5 h-8 w-28 grow animate-pulse rounded-md bg-neutral-200" />
      <ChevronsUpDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
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
        className="relative max-h-[min(260px,calc(100vh-300px))] w-full space-y-0.5 overflow-auto rounded-lg bg-white text-base sm:w-64 sm:text-sm"
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
  programs,
  selectedProgram,
  setOpenPopover,
}: {
  programs: ProgramProps[];
  selectedProgram?: ProgramProps;
  setOpenPopover: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const href = useCallback(
    (slug: string) =>
      selectedProgram
        ? pathname?.replace(selectedProgram.slug, slug).split("?")[0] || "/"
        : `/programs/${slug}`,
    [pathname, selectedProgram],
  );

  return (
    <Command defaultValue={selectedProgram?.name} loop>
      <div>
        <label className="flex w-full items-center border-b border-neutral-200 pl-3.5">
          <span className="sr-only">Search</span>
          <Magnifier className="size-[1.125rem] text-neutral-500" />
          <Command.Input
            className="h-12 w-full border-0 px-2.5 text-base placeholder:text-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
            placeholder="Find program..."
          />
        </label>
        <ScrollContainer>
          <div className="p-2">
            <div className="flex items-center justify-between py-2">
              <p className="px-1 text-xs font-medium text-neutral-500">
                Programs
              </p>
            </div>
            <AnimatedSizeContainer
              height
              className="rounded-[inherit]"
              style={{ transform: "translateZ(0)" }} // Fixes overflow on some browsers
            >
              <div className="flex flex-col gap-0.5">
                <Command.List>
                  {programs.map(({ slug, name, logo }) => (
                    <Command.Item
                      key={slug}
                      asChild
                      value={name}
                      onSelect={() => {
                        router.push(href(slug));
                        setOpenPopover(false);
                      }}
                    >
                      <Link
                        key={slug}
                        className={cn(
                          "relative flex w-full items-center gap-x-2.5 rounded-md px-2 py-2.5 transition-all duration-75",
                          "active:bg-neutral-200/80 data-[selected=true]:bg-neutral-200/50",
                          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                        )}
                        href={href(slug)}
                        shallow={false}
                        onClick={() => setOpenPopover(false)}
                        tabIndex={-1}
                      >
                        <BlurImage
                          src={logo || `${OG_AVATAR_URL}${name}`}
                          width={40}
                          height={40}
                          alt={name}
                          className="size-5 shrink-0 overflow-hidden rounded-full border border-black/10"
                        />
                        <span className="block min-w-0 grow truncate text-sm leading-5 text-neutral-800">
                          {name}
                        </span>
                        {selectedProgram?.slug === slug ? (
                          <Check2
                            className="size-4 shrink-0 text-neutral-600"
                            aria-hidden="true"
                          />
                        ) : null}
                      </Link>
                    </Command.Item>
                  ))}
                  <Command.Empty className="p-1 text-xs text-neutral-400">
                    No programs found
                  </Command.Empty>
                </Command.List>
              </div>
            </AnimatedSizeContainer>
          </div>
        </ScrollContainer>
      </div>
    </Command>
  );
}
