"use client";

import {
  PartnerProps,
  PartnerWithProgramsProps,
  ProgramProps,
} from "@/lib/types";
import { BlurImage, Popover, useScrollProgress } from "@dub/ui";
import { Check2, Connections3, Gear } from "@dub/ui/src/icons";
import { APP_DOMAIN, cn, DICEBEAR_AVATAR_URL, fetcher } from "@dub/utils";
import { ChevronsUpDown, HelpCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { notFound, useParams, usePathname } from "next/navigation";
import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";

const LINKS = ({ partnerId }: { partnerId: string }) => [
  {
    name: "Settings",
    icon: Gear,
    href: `/${partnerId}/settings`,
  },
  {
    name: "Help center",
    icon: HelpCircle,
    href: "https://dub.co/help",
    target: "_blank",
  },
  {
    name: "Switch to Business Hub",
    icon: Connections3,
    href: APP_DOMAIN,
  },
];

export function PartnerProgramDropdown() {
  const { data: session, status } = useSession();
  const { partnerId, programId } = useParams() as {
    partnerId?: string;
    programId?: string;
  };

  const { data: partners, error } = useSWR<PartnerWithProgramsProps[]>(
    session?.user && "/api/partners",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  const selectedPartner = useMemo(() => {
    const partner = partners?.find((partner) => partner.id === partnerId);

    return partnerId && partner
      ? {
          ...partner,
          logo: partner.logo || `${DICEBEAR_AVATAR_URL}${partner.name}`,
        }
      : undefined;
  }, [partnerId, partners]);

  const programs = selectedPartner?.programs;

  const selectedProgram = useMemo(() => {
    const program = programs?.find((program) => program.id === programId);
    return programId && program
      ? {
          ...program,
          logo: program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`,
        }
      : undefined;
  }, [programId, programs]);

  const [openPopover, setOpenPopover] = useState(false);

  if (!partners || status === "loading") {
    return <PartnerDropdownPlaceholder />;
  }

  if (!partnerId || !selectedPartner) notFound();

  return (
    <div>
      <Popover
        content={
          <ScrollContainer>
            {programs && (
              <div className="border-b border-neutral-200 p-2">
                <ProgramList
                  selected={selectedProgram}
                  programs={programs}
                  selectedPartner={selectedPartner}
                  setOpenPopover={setOpenPopover}
                />
              </div>
            )}
            <div className="p-2">
              <PartnerList
                selected={selectedProgram ? undefined : selectedPartner}
                partners={partners}
                selectedProgram={selectedProgram}
                setOpenPopover={setOpenPopover}
              />
              <div className="mt-0.5 flex flex-col gap-0.5">
                {LINKS({ partnerId }).map(
                  ({ name, icon: Icon, href, target }) => (
                    <Link
                      key={name}
                      href={href}
                      target={target}
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
              src={selectedProgram?.logo || selectedPartner.logo}
              referrerPolicy="no-referrer"
              width={28}
              height={28}
              alt={selectedProgram?.name || selectedPartner.name}
              className="h-7 w-7 flex-none shrink-0 overflow-hidden rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selectedProgram?.name || selectedPartner.name}
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

function PartnerList({
  selected,
  partners,
  selectedProgram,
  setOpenPopover,
}: {
  selected?: PartnerProps;
  partners: PartnerProps[];
  selectedProgram?: ProgramProps;
  setOpenPopover: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const href = useCallback(
    (id: string) =>
      selectedProgram || !selected
        ? `/${id}`
        : pathname?.replace(selected.id, id).split("?")[0] || "/",
    [pathname, selectedProgram, selected],
  );

  return (
    <div>
      <div className="flex flex-col gap-0.5">
        {partners.map(({ id, name, logo }) => {
          const isActive = selected?.id === id;
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
                  Partner
                </div>
              </div>
              {selected?.id === id ? (
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

function ProgramList({
  selectedPartner,
  selected,
  programs,
  setOpenPopover,
}: {
  selectedPartner: PartnerProps;
  selected?: ProgramProps;
  programs: ProgramProps[];
  setOpenPopover: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const href = useCallback(
    (id: string) =>
      selected
        ? pathname?.replace(selected.id, id).split("?")[0] || "/"
        : `/${selectedPartner.id}/${id}`,
    [pathname, selected],
  );

  return (
    <div>
      <div className="flex items-center justify-between pb-1">
        <p className="px-1 text-xs font-medium text-neutral-500">Programs</p>
      </div>
      <div className="flex flex-col gap-0.5">
        {programs.map(({ id, name, logo }) => {
          const isActive = selected?.id === id;
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
              {selected?.id === id ? (
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
