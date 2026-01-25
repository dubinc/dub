"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useCustomersCount from "@/lib/swr/use-customers-count";
import useDomainsCount from "@/lib/swr/use-domains-count";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaceUsers from "@/lib/swr/use-workspace-users";
import { CheckCircleFill } from "@/ui/shared/icons";
import {
  Button,
  Popover,
  ProgressCircle,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { CircleDotted, ExpandingArrow } from "@dub/ui/icons";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { forwardRef, HTMLAttributes, Ref, useMemo, useState } from "react";

export function OnboardingButton() {
  const { isMobile } = useMediaQuery();
  const [hideForever, setHideForever] = useLocalStorage(
    "onboarding-hide-forever",
    false,
  );

  return !isMobile && !hideForever ? (
    <OnboardingButtonInner onHideForever={() => setHideForever(true)} />
  ) : null;
}

function OnboardingButtonInner({
  onHideForever,
}: {
  onHideForever: () => void;
}) {
  const { slug } = useParams() as { slug: string };
  const { plan, totalLinks, defaultProgramId } = useWorkspace();

  const { canTrackConversions } = getPlanCapabilities(plan);

  const { data: domainsCount, loading: domainsLoading } = useDomainsCount({
    ignoreParams: true,
  });
  const { users, loading: usersLoading } = useWorkspaceUsers();

  const { data: customersCount, loading: customersCountLoading } =
    useCustomersCount<number>({
      includeParams: [],
      enabled: canTrackConversions,
    });

  const { partnersCount, loading: partnersCountLoading } =
    usePartnersCount<number>({
      ignoreParams: true,
      enabled: Boolean(defaultProgramId),
    });

  const loading =
    domainsLoading ||
    usersLoading ||
    customersCountLoading ||
    partnersCountLoading;

  const tasks = useMemo(() => {
    return [
      {
        display: "Connect a domain",
        cta: `/${slug}/settings/domains`,
        checked: domainsCount && domainsCount > 0,
        recommended: true,
      },
      ...(defaultProgramId
        ? [
            {
              display: "Create a program",
              cta: `/${slug}/program`,
              checked: true,
              recommended: true,
            },
            {
              display: "Set up conversion tracking",
              cta: `/${slug}/settings/analytics`,
              checked: customersCount && customersCount > 0,
              recommended: true,
            },
            {
              display: "Invite your partners",
              cta: `/${slug}/program/partners`,
              checked: partnersCount && partnersCount > 0,
              recommended: true,
            },
          ]
        : [
            {
              display: "Create a short link",
              cta: `/${slug}/links`,
              checked: totalLinks && totalLinks > 0,
              recommended: true,
            },
            {
              display: "Invite your team",
              cta: `/${slug}/settings/people`,
              checked: users && users.length > 1,
              recommended: false,
            },
          ]),
    ];
  }, [
    slug,
    defaultProgramId,
    domainsCount,
    customersCount,
    partnersCount,
    totalLinks,
    users,
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const recommendedTasks = tasks.filter((task) => task.recommended);

  const remainingRecommendedTasks = recommendedTasks.filter(
    (task) => !task.checked,
  ).length;

  return loading || remainingRecommendedTasks === 0 ? null : (
    <Popover
      align="end"
      popoverContentClassName="rounded-xl"
      content={
        <div>
          <div className="rounded-t-xl bg-black p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-base font-medium">Complete setup</span>
                <p className="mt-1 text-sm text-neutral-300">
                  Finish setting up your{" "}
                  {defaultProgramId ? "program" : "workspace"}
                  <br className="hidden sm:block" />
                  to get the most out of Dub
                </p>
              </div>
              <div className="flex items-center gap-1">
                <MiniButton onClick={() => setIsOpen(false)}>
                  <ChevronDown className="size-4" />
                </MiniButton>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="grid divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {tasks.map(({ display, cta, checked }) => {
                return (
                  <Link
                    key={display}
                    href={cta}
                    onClick={() => setTimeout(() => setIsOpen(false), 500)}
                  >
                    <div className="group flex items-center justify-between gap-3 p-3 sm:gap-10">
                      <div className="flex items-center gap-2">
                        {checked ? (
                          <CheckCircleFill className="size-5 text-green-500" />
                        ) : (
                          <CircleDotted className="size-5 text-neutral-400" />
                        )}
                        <p className="text-sm text-neutral-800">{display}</p>
                      </div>
                      <div className="mr-5">
                        <ExpandingArrow className="text-neutral-500" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Button
              text="Dismiss guide"
              variant="outline"
              onClick={() => {
                onHideForever();
                setIsOpen(false);
              }}
              className="mt-3 h-7 rounded-lg bg-black/[0.04] duration-75 hover:bg-black/[0.07] active:scale-[0.98]"
            />
          </div>
        </div>
      }
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
    >
      <button
        type="button"
        className="animate-slide-up-fade flex h-8 items-center justify-center gap-1.5 rounded-full border border-neutral-950 bg-neutral-950 px-3 text-xs font-medium leading-tight text-white shadow-md transition-all [--offset:10px] hover:bg-neutral-800 hover:ring-4 hover:ring-neutral-200"
      >
        <span>Complete setup</span>
        <ProgressCircle
          progress={1 - remainingRecommendedTasks / recommendedTasks.length}
          className="size-3 text-white/80 [--track-color:#fff3]"
          strokeWidth={14}
        />
      </button>
    </Popover>
  );
}

const MiniButton = forwardRef(
  (props: HTMLAttributes<HTMLButtonElement>, ref: Ref<HTMLButtonElement>) => {
    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className="rounded-md px-1 py-1 text-neutral-400 transition-colors hover:bg-white/20 active:text-white"
      />
    );
  },
);
