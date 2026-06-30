"use client";

import { canAccessDubPartners } from "@/lib/auth/product-access-guard";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { SimpleEmptyState } from "@/ui/shared/simple-empty-state";
import { ShieldSlash, buttonVariants } from "@dub/ui";
import { cn, isLegacyBusinessPlan } from "@dub/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ReactNode } from "react";
import { PartnersUpgradeCTA } from "./partners-upgrade-cta";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const {
    id: workspaceId,
    slug,
    plan,
    defaultProgramId,
    partnersLimit,
    loading,
  } = useWorkspace();
  const { loading: programLoading } = useProgram();

  if (loading || (defaultProgramId && programLoading)) {
    return <LayoutLoader />;
  }

  const hasProgramAccess = canAccessDubPartners({
    workspaceId,
    userId: session?.user.id,
  });

  // TEMPORARY: block Dub Partners access for restricted workspace users
  if (!hasProgramAccess && slug) {
    return <AccessDenied slug={slug} />;
  }

  if (
    !defaultProgramId ||
    !getPlanCapabilities(plan).canManageProgram ||
    isLegacyBusinessPlan({ plan, partnersLimit })
  ) {
    return (
      <PageContent>
        <PartnersUpgradeCTA />
      </PageContent>
    );
  }

  return children;
}

function AccessDenied({ slug }: { slug: string }) {
  return (
    <PageContent>
      <SimpleEmptyState
        title="You don't have access to Dub Partners"
        description="Your workspace admin has restricted access to Dub Partners for your account. Contact them if you believe this is a mistake."
        graphic={
          <div className="flex size-16 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
            <ShieldSlash className="size-6 text-neutral-800" />
          </div>
        }
        addButton={
          <Link
            href={slug ? `/${slug}/links` : "/links"}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-9 items-center whitespace-nowrap rounded-lg border px-4 text-sm",
            )}
          >
            Go to Dub Links
          </Link>
        }
      />
    </PageContent>
  );
}
