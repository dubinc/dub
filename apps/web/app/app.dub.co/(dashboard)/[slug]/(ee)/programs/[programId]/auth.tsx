"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const {
    slug,
    plan,
    defaultProgramId,
    partnersEnabled,
    loading,
    mutate: mutateWorkspace,
  } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  // after Dub Partners goes GA, we can combine this with the upgrade CTA below
  if (!defaultProgramId) {
    if (partnersEnabled) {
      redirect(`/${slug}/programs/new`);
    } else {
      redirect(`/${slug}`);
    }
  }

  if (!getPlanCapabilities(plan).canManageProgram) {
    return <UpgradeCTA />;
  }

  return children;
}

const UpgradeCTA = () => {
  const { slug } = useWorkspace();
  return (
    <>
      <div className="absolute inset-0 flex touch-pan-y flex-col items-center justify-center bg-gradient-to-t from-[#fff_75%] to-[#fff6] px-4 text-center">
        <div className="h-40 w-full max-w-[480px] overflow-hidden [mask-image:linear-gradient(black,transparent)]">
          <div className="relative h-96 w-full overflow-hidden rounded-lg border border-neutral-200">
            <Image
              src="https://assets.dub.co/misc/partners-screenshot.jpg"
              fill
              className="object-contain object-top"
              alt="Dub Partners screenshot"
              draggable={false}
            />
          </div>
        </div>
        <div className="relative -mt-4 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-neutral-700">
            Dub Partners
          </span>
          <p className="mt-3 max-w-sm text-pretty text-sm text-neutral-500">
            Kickstart viral product-led growth with powerful, branded referral
            and affiliate programs.{" "}
            <a
              href="https://dub.co/partners"
              target="_blank"
              className="underline underline-offset-2 hover:text-neutral-800"
            >
              Learn more ↗
            </a>
          </p>
          <div className="mt-4">
            <Link
              href={`/${slug}/upgrade`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center justify-center gap-2 rounded-md border px-4 text-sm",
              )}
            >
              <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Upgrade to Business
              </span>
            </Link>
          </div>
        </div>
      </div>
      <div className="h-[420px]" />
    </>
  );
};
