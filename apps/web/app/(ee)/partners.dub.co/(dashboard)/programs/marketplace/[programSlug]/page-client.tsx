"use client";

import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { NetworkProgramProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import {
  Button,
  ChevronRight,
  Shop,
  StatusBadge,
  buttonVariants,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";

export function MarketplaceProgramPageClient() {
  const { programSlug } = useParams();

  const {
    data: program,
    isLoading,
    error,
  } = useSWR<NetworkProgramProps>(
    programSlug ? `/api/network/programs/${programSlug}` : null,
    fetcher,
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
          <Button
            text="Apply"
            shortcut="A"
            onClick={() => {
              toast.info("WIP");
            }}
            disabledTooltip={
              program.status === "banned"
                ? "You are banned from this program"
                : program.status === "pending"
                  ? "Your application is under review"
                  : program.status === "rejected"
                    ? "Your application was rejected"
                    : undefined
            }
            className="h-9 rounded-lg"
          />
        )
      }
    >
      <PageWidthWrapper className="mb-10">test</PageWidthWrapper>
    </PageContent>
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

  return (
    <Button
      text="Accept invite"
      shortcut="A"
      onClick={() => executeAsync({ programId: program.id })}
      loading={isPending}
      className="h-9 rounded-lg"
    />
  );
}
