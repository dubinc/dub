"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { NetworkProgramExtendedProps, NetworkProgramProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { ProgramCategory } from "@/ui/partners/program-network/program-category";
import { ProgramRewardIcon } from "@/ui/partners/program-network/program-reward-icon";
import {
  Button,
  ChevronRight,
  Gift,
  Link4,
  Shop,
  StatusBadge,
  Tooltip,
  buttonVariants,
  useKeyboardShortcut,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, fetcher, getPrettyUrl } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";

export function MarketplaceProgramPageClient() {
  const { programSlug } = useParams();

  const { data: program, error } = useSWR<NetworkProgramExtendedProps>(
    programSlug ? `/api/network/programs/${programSlug}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Link
              href="/programs/marketplace"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <Shop className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
              Program details
            </span>
            {statusBadge && (
              <StatusBadge
                variant={statusBadge.variant}
                icon={statusBadge.icon}
                className="py-0.5"
              >
                {statusBadge.label}
              </StatusBadge>
            )}
          </div>
        </div>
      }
      controls={
        !program ? undefined : program.status === "invited" ? (
          <AcceptInviteButton key={program.id} program={program} />
        ) : program.status === "approved" ? (
          <Link
            href={`/programs/${program.slug}`}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-9 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
            )}
          >
            View dashboard
          </Link>
        ) : (
          <ApplyButton program={program} />
        )
      }
    >
      <PageWidthWrapper className="mb-10">
        <div className="mx-auto mt-10 w-full max-w-screen-sm">
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-20 rounded-full"
            />
          ) : (
            <div className="size-20 animate-pulse rounded-full bg-neutral-200" />
          )}

          <div className="mt-6 flex flex-col">
            {program ? (
              <span className="text-content-emphasis text-3xl font-semibold">
                {program.name}
              </span>
            ) : (
              <div className="h-9 w-48 animate-pulse rounded bg-neutral-200" />
            )}

            <div className="text-content-default mt-1 flex items-center gap-1">
              <Link4 className="size-3.5" />
              {program ? (
                <a
                  href={program.url || `https://${program.domain}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm font-medium"
                >
                  {getPrettyUrl(program.url) || program.domain}
                </a>
              ) : (
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-8">
            {program ? (
              <>
                {Boolean(program?.rewards?.length || program?.discount) && (
                  <div>
                    <span className="text-content-muted block text-xs font-medium">
                      Rewards
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.rewards?.map((reward) => (
                        <ProgramRewardIcon
                          key={reward.id}
                          icon={REWARD_EVENTS[reward.event].icon}
                          description={formatRewardDescription({ reward })}
                        />
                      ))}
                      {program.discount && (
                        <ProgramRewardIcon
                          icon={Gift}
                          description={formatDiscountDescription({
                            discount: program.discount,
                          })}
                        />
                      )}
                    </div>
                  </div>
                )}
                {Boolean(program?.categories?.length) && (
                  <div className="min-w-0">
                    <span className="text-content-muted block text-xs font-medium">
                      Industry
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.categories
                        .slice(0, 1)
                        ?.map((category) => (
                          <ProgramCategory key={category} category={category} />
                        ))}
                      {program.categories.length > 1 && (
                        <Tooltip
                          content={
                            <div className="flex flex-col gap-0.5 p-2">
                              {program.categories.slice(1).map((category) => (
                                <ProgramCategory
                                  key={category}
                                  category={category}
                                />
                              ))}
                            </div>
                          }
                        >
                          <div className="text-content-subtle -ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium">
                            +{program.categories.length - 1}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="h-3.5 w-12 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 h-6 w-24 animate-pulse rounded bg-neutral-200" />
              </div>
            )}
          </div>

          {program && (
            <div>
              <LanderHero
                program={program}
                landerData={program.landerData || {}}
                className="mt-8 sm:mt-8"
              />

              <LanderRewards
                className="mt-4"
                rewards={program.rewards || []}
                discount={program.discount || null}
              />

              {program.landerData && (
                <div className="mt-16 grid grid-cols-1 gap-10">
                  {program.landerData.blocks.map((block, idx) => {
                    const Component = BLOCK_COMPONENTS[block.type];
                    return Component ? (
                      <Component key={idx} block={block} program={program} />
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}

function ApplyButton({ program }: { program: NetworkProgramProps }) {
  const { programApplicationSheet, setIsOpen: setIsApplicationSheetOpen } =
    useProgramApplicationSheet({
      program,
      backDestination: "marketplace",
      onSuccess: () => mutatePrefix("/api/network/programs"),
    });

  const disabledTooltip =
    program.status === "banned"
      ? "You are banned from this program"
      : program.status === "pending"
        ? "Your application is under review"
        : program.status === "rejected"
          ? "Your application was rejected"
          : undefined;

  useKeyboardShortcut("a", () => setIsApplicationSheetOpen(true), {
    enabled: !disabledTooltip,
  });

  return (
    <>
      {programApplicationSheet}
      <Button
        text="Apply"
        shortcut="A"
        onClick={() => setIsApplicationSheetOpen(true)}
        disabledTooltip={disabledTooltip}
        className="h-9 rounded-lg"
      />
    </>
  );
}

function AcceptInviteButton({ program }: { program: NetworkProgramProps }) {
  const router = useRouter();

  const { executeAsync, isPending } = useAction(acceptProgramInviteAction, {
    onSuccess: async () => {
      await mutatePrefix("/api/partner-profile/programs");
      toast.success("Program invite accepted!");
      router.push(`/programs/${program.slug}`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onAccept = () => executeAsync({ programId: program.id });

  useKeyboardShortcut("a", onAccept, {
    enabled: !isPending,
  });

  return (
    <Button
      text="Accept invite"
      shortcut="A"
      onClick={onAccept}
      loading={isPending}
      className="h-9 rounded-lg"
    />
  );
}
