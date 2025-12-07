"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { NetworkProgramExtendedProps, NetworkProgramProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import { useProgramApplicationSheet } from "@/ui/partners/program-application-sheet";
import { ProgramCategory } from "@/ui/partners/program-network/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-network/program-rewards-display";
import {
  Button,
  ChevronRight,
  Shop,
  StatusBadge,
  Tooltip,
  buttonVariants,
  useKeyboardShortcut,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";

export function MarketplaceProgramPageClient() {
  const { programSlug } = useParams();

  const { data: program } = useSWR<NetworkProgramExtendedProps>(
    programSlug ? `/api/network/programs/${programSlug}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;

  if (!program)
    return (
      <PageContent
        title={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div className="bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg">
                <div className="size-4 animate-pulse rounded bg-neutral-200" />
              </div>
              <div className="size-2.5 shrink-0 animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="h-5 w-16 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        }
        controls={
          <div className="h-9 w-20 animate-pulse rounded-lg bg-neutral-200" />
        }
      >
        <PageWidthWrapper>
          <div className="relative">
            <div className="relative mx-auto max-w-screen-md p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
              </div>

              <div className="mt-6 flex flex-col">
                <div className="h-9 w-64 animate-pulse rounded bg-neutral-200" />
                <div className="mt-2 flex max-w-md items-center gap-1">
                  <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
                </div>
              </div>

              <div className="mt-6 flex gap-8">
                <div>
                  <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
                    <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-6 w-20 animate-pulse rounded-md bg-neutral-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-screen-md">
            <div className="mt-8 grid grid-cols-1 gap-5 py-6 sm:mt-8">
              <div className="h-8 w-96 animate-pulse rounded bg-neutral-200" />
              <div className="h-6 w-full max-w-md animate-pulse rounded bg-neutral-200" />
            </div>

            <div className="mt-4">
              <div className="mb-2 h-5 w-20 animate-pulse rounded bg-neutral-200" />
              <div className="h-20 w-full animate-pulse rounded-lg bg-neutral-200" />
            </div>

            <div className="mt-16 grid grid-cols-1 gap-10">
              <div className="h-64 w-full animate-pulse rounded-lg bg-neutral-200" />
              <div className="h-64 w-full animate-pulse rounded-lg bg-neutral-200" />
            </div>
          </div>
        </PageWidthWrapper>
      </PageContent>
    );

  const isDarkImage = program.marketplaceHeaderImage?.includes("dark");

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
      <PageWidthWrapper>
        <div className="relative">
          {program.featuredOnMarketplaceAt &&
            program.marketplaceHeaderImage && (
              <img
                src={program.marketplaceHeaderImage}
                alt={program.name}
                className="border-border-subtle absolute inset-0 size-full overflow-hidden rounded-xl border object-cover"
              />
            )}
          <div className="relative mx-auto max-w-screen-md p-8">
            <div className="flex items-start justify-between gap-4">
              {program ? (
                <img
                  src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                  alt={program.name}
                  className="size-16 rounded-full border border-white/20"
                />
              ) : (
                <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
              )}
            </div>

            <div className="mt-6 flex flex-col">
              <span
                className={cn(
                  "text-3xl font-semibold",
                  isDarkImage && "text-content-inverted",
                )}
              >
                {program.name}
              </span>

              <div
                className={cn(
                  "mt-2 flex max-w-md items-center gap-1",
                  isDarkImage && "text-content-inverted/90",
                )}
              >
                {program.name} is a program in the Dub Partner Network. Join the
                network to start partnering with them.
              </div>
            </div>

            <div className="mt-6 flex gap-8">
              {Boolean(program.rewards?.length || program.discount) && (
                <div>
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      isDarkImage && "text-content-inverted/70",
                    )}
                  >
                    Rewards
                  </span>
                  <ProgramRewardsDisplay
                    rewards={program.rewards}
                    discount={program.discount}
                    isDarkImage={isDarkImage}
                    className="mt-1"
                    descriptionClassName="max-w-[240px]"
                  />
                </div>
              )}
              {Boolean(program.categories?.length) && (
                <div className="min-w-0">
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      isDarkImage && "text-content-inverted/70",
                    )}
                  >
                    Category
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {program.categories
                      .slice(0, 1)
                      ?.map((category) => (
                        <ProgramCategory
                          key={category}
                          category={category}
                          className={cn(isDarkImage && "text-content-inverted")}
                        />
                      ))}
                    {program.categories.length > 1 && (
                      <Tooltip
                        content={
                          <div className="flex flex-col gap-0.5 p-2">
                            {program.categories.slice(1).map((category) => (
                              <ProgramCategory
                                key={category}
                                category={category}
                                className={cn(
                                  isDarkImage && "text-content-inverted",
                                )}
                              />
                            ))}
                          </div>
                        }
                      >
                        <div
                          className={cn(
                            "-ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium",
                            isDarkImage && "text-content-inverted/70",
                          )}
                        >
                          +{program.categories.length - 1}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-screen-md">
          <LanderHero
            program={program}
            landerData={program.landerData || {}}
            showLabel={false}
            className="mt-8 sm:mt-8"
            heading="h2"
            titleClassName="text-2xl"
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
                  <Component
                    key={idx}
                    block={block}
                    group={{ logo: program.logo }}
                  />
                ) : null;
              })}
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
