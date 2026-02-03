"use client";

import { DIRECT_DEBIT_PAYMENT_METHOD_TYPES } from "@/lib/constants/payouts";
import useDomains from "@/lib/swr/use-domains";
import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { WorkspaceProps } from "@/lib/types";
import { useAnalyticsConnectedStatus } from "@/ui/analytics/use-analytics-connected-status";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import {
  BlurImage,
  Book2,
  Button,
  Check2,
  CircleQuestion,
  ConnectedDots4,
  CursorRays,
  Globe,
  GreekTemple,
  Hyperlink,
  LinesY,
  LoadingSpinner,
  Msg,
  Plug2,
  Users,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function SuccessPageClient({
  workspace,
}: {
  workspace: Pick<
    WorkspaceProps,
    "name" | "slug" | "logo" | "defaultProgramId"
  >;
}) {
  const { loading: isLoadingWorkspace } = useWorkspace();

  const { finish, isLoading, isSuccessful } = useOnboardingProgress();

  const hasProgram = Boolean(workspace.defaultProgramId);

  const { allWorkspaceDomains, loading: isLoadingDomains } = useDomains();
  const connectedDomain = Boolean(allWorkspaceDomains?.length);

  const { isConnected: connectedAnalytics } = useAnalyticsConnectedStatus();
  const { paymentMethods, loading: isLoadingPaymentMethods } =
    usePaymentMethods({
      enabled: hasProgram,
    });
  const connectedBankAccount = paymentMethods?.some((pm) =>
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(pm.type),
  );

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center pb-10">
      <div
        className={cn(
          "flex flex-col items-center",
          "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        {workspace.logo && (
          <div className="relative mb-5">
            <BlurImage
              src={workspace.logo}
              alt="workspace logo"
              className="size-24 rounded-full"
              width={96}
              height={96}
            />
            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-green-400 ring-4 ring-white">
              <Check2 className="size-4 text-green-800" />
            </div>
          </div>
        )}
        <h1 className="text-pretty text-center text-xl font-semibold">
          The {workspace.name} workspace has been created
        </h1>
        <MarkdownDescription className="mt-2 text-pretty text-center text-base text-neutral-500">
          {hasProgram
            ? "Now you can manage your [partner program](https://dub.co/partners) and [short links](https://dub.co/links) all in one place"
            : "Now you have one central, organized place to create and [manage all your short links](https://dub.co/help/category/link-management)."}
        </MarkdownDescription>
        <div className="mt-4 w-full">
          <Button
            onClick={() => finish({ hasProgram })}
            loading={isLoading || isSuccessful}
            text="Go to your dashboard"
            className="h-9 rounded-lg"
          />
        </div>
      </div>

      <div
        className={cn(
          "mt-8 flex w-full max-w-[400px] flex-col gap-3",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:250ms] [animation-duration:0.5s] [animation-fill-mode:both]",
        )}
      >
        <h3 className="text-content-emphasis font-semibold">Complete setup</h3>

        <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y overflow-hidden rounded-lg border">
          {[
            {
              icon: Globe,
              title: "Connect domain",
              description: "Claim a free domain or connect your own",
              href: `/${workspace.slug}/settings/domains`,
              cta: connectedDomain ? "Manage" : "Connect",
              loading: isLoadingDomains,
              complete: Boolean(allWorkspaceDomains?.length),
            },
            ...(hasProgram
              ? [
                  {
                    icon: ConnectedDots4,
                    title: "Create a program",
                    description: "Set up your Dub partner program",
                    href: `/${workspace.slug}/program`,
                    cta: "Manage",
                    complete: true,
                  },
                  {
                    icon: Plug2,
                    title: "Set up conversion tracking",
                    description: "Install the Dub tracking script",
                    href: `/${workspace.slug}/settings/analytics`,
                    cta: "Install",
                    loading: isLoadingWorkspace,
                    complete: connectedAnalytics,
                  },
                  {
                    icon: GreekTemple,
                    title: "Connect bank account",
                    description: "Connect a bank account for payouts",
                    href: `/${workspace.slug}/program/payouts`,
                    cta: "Connect",
                    loading: isLoadingWorkspace || isLoadingPaymentMethods,
                    complete: connectedBankAccount,
                  },
                ]
              : [
                  {
                    icon: Hyperlink,
                    title: "Create a short link",
                    description: "Create your first Dub short link",
                    href: `/${workspace.slug}/links?newLink=true`,
                    cta: "Create",
                  },
                  {
                    icon: LinesY,
                    title: "Explore analytics",
                    description: "View clicks and performance data",
                    href: `/${workspace.slug}/analytics`,
                    cta: "View",
                  },
                  {
                    icon: CursorRays,
                    title: "Explore events",
                    description: "View events for your short links",
                    href: `/${workspace.slug}/events`,
                    cta: "View",
                  },
                ]),
          ].map(
            ({
              icon: Icon,
              title,
              description,
              href,
              cta,
              loading,
              complete,
            }) => (
              <div
                key={href}
                className={cn(
                  "flex items-center justify-between gap-2 px-2.5 py-2",
                  complete && "bg-black/[0.02]",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md bg-black/5",
                      complete && "bg-green-400",
                    )}
                  >
                    {loading ? (
                      <LoadingSpinner className="size-4" />
                    ) : complete ? (
                      <Check2 className="size-4 text-green-800" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "min-w-0",
                      (loading || complete) && "opacity-60",
                    )}
                  >
                    <div className="text-content-default text-sm font-medium">
                      {title}
                    </div>
                    <p className="text-content-subtle truncate text-xs font-medium">
                      {description}
                    </p>
                  </div>
                </div>

                <Link
                  href={href}
                  target="_blank"
                  className="border-subtle bg-bg-default hover:bg-bg-muted flex h-7 items-center rounded-lg border px-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
                >
                  {cta}
                </Link>
              </div>
            ),
          )}
        </div>
      </div>

      <div
        className={cn(
          "mt-8 flex w-full max-w-[400px] flex-col gap-3",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:250ms] [animation-duration:0.5s] [animation-fill-mode:both]",
        )}
      >
        <h3 className="text-content-emphasis font-semibold">
          Additional resources
        </h3>

        <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y rounded-lg border">
          {[
            {
              icon: Users,
              title: "Team members",
              description: "Invite and manage team members",
              href: `/${workspace.slug}/settings/members`,
              cta: "Invite",
            },
            {
              icon: CircleQuestion,
              title: "Help center",
              description: "Answers to your questions",
              href: "https://dub.co/help",
              cta: "Read",
            },
            {
              icon: Book2,
              title: "Docs",
              description: "Platform documentation",
              href: "https://dub.co/docs",
              cta: "Learn",
            },
            {
              icon: Msg,
              title: "Support",
              description: "Product support or help requests",
              href: "https://dub.co/contact/support",
              cta: "Chat",
            },
          ].map(({ icon: Icon, title, description, href, cta }) => (
            <div
              key={href}
              className="flex items-center justify-between gap-2 px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-black/5">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-content-default text-sm font-medium">
                    {title}
                  </div>
                  <p className="text-content-subtle truncate text-xs font-medium">
                    {description}
                  </p>
                </div>
              </div>

              <Link
                href={href}
                target="_blank"
                className="border-subtle bg-bg-default hover:bg-bg-muted flex h-7 items-center rounded-lg border px-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
