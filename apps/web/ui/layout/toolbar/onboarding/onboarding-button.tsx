"use client";

import useDomainsCount from "@/lib/swr/use-domains-count";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { CheckCircleFill, ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, useLocalStorage, useMediaQuery } from "@dub/ui";
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
  const { totalLinks } = useWorkspace();

  const { data: domainsCount, loading: domainsLoading } = useDomainsCount({
    ignoreParams: true,
  });
  const { users, loading: usersLoading } = useUsers();
  const { users: invites, loading: invitesLoading } = useUsers({
    invites: true,
  });

  const loading = domainsLoading || usersLoading || invitesLoading;

  const tasks = useMemo(() => {
    return [
      {
        display: "Create a new Dub link",
        cta: `/${slug}`,
        checked: totalLinks === 0 ? false : true,
      },
      {
        display: "Set up your custom domain",
        cta: `/${slug}/settings/domains`,
        checked: domainsCount && domainsCount > 0,
      },
      {
        display: "Invite your teammates",
        cta: `/${slug}/settings/people`,
        checked: (users && users.length > 1) || (invites && invites.length > 0),
      },
    ];
  }, [slug, domainsCount, totalLinks, users, invites]);

  const [isOpen, setIsOpen] = useState(false);

  const completedTasks = tasks.filter((task) => task.checked).length;

  return loading || completedTasks === tasks.length ? null : (
    <Popover
      align="end"
      popoverContentClassName="rounded-xl"
      content={
        <div>
          <div className="rounded-t-xl bg-black p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-base font-medium">Getting Started</span>
                <p className="mt-1 text-sm text-neutral-300">
                  Get familiar with Dub by completing the{" "}
                  <br className="hidden sm:block" />
                  following tasks
                </p>
              </div>
              <div className="flex items-center gap-1">
                <OnboardingMenu
                  onHideForever={() => {
                    onHideForever();
                    setIsOpen(false);
                  }}
                />
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
                    onClick={() => setIsOpen(false)}
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
          </div>
        </div>
      }
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
    >
      <button
        type="button"
        className="animate-slide-up-fade -mt-1 flex h-12 flex-col items-center justify-center rounded-full border border-neutral-950 bg-neutral-950 px-6 text-xs font-medium leading-tight text-white shadow-md transition-all [--offset:10px] hover:bg-neutral-800 hover:ring-4 hover:ring-neutral-200"
      >
        <span>Getting Started</span>
        <span className="text-neutral-400">
          {Math.round((completedTasks / tasks.length) * 100)}% complete
        </span>
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

function OnboardingMenu({ onHideForever }: { onHideForever: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      align="end"
      content={
        <div className="p-1">
          <Button
            onClick={onHideForever}
            variant="outline"
            text="Dismiss forever"
            className="h-9"
          />
        </div>
      }
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
    >
      <MiniButton>
        <ThreeDots className="size-4" />
      </MiniButton>
    </Popover>
  );
}
