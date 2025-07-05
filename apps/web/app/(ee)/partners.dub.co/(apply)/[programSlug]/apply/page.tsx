import { getProgram } from "@/lib/fetchers/get-program";
import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramApplicationForm } from "@/ui/partners/lander/program-application-form";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { Header } from "../header";

export default async function ApplicationPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await getProgram({
    slug: programSlug,
    include: ["allRewards", "allDiscounts"],
  });

  if (!program) {
    notFound();
  }

  const { rewards, discount } =
    getProgramApplicationRewardsAndDiscount(program);

  return (
    <div
      className="relative"
      style={
        {
          "--brand": program.brandColor || "#000000",
          "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
        } as CSSProperties
      }
    >
      <Header program={program} showApply={false} />
      <div className="p-6">
        {/* Hero section */}
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
            {program.name} Affiliate Program
          </p>
          <h1 className="text-4xl font-semibold">Apply to {program.name}</h1>
          <p className="text-base text-neutral-700">
            Submit your application to join the {program.name} affiliate program
            and start earning commissions for your referrals.
          </p>
        </div>

        <LanderRewards
          className="mt-10"
          rewards={rewards}
          discount={discount}
        />

        {/* Application form */}
        <div className="mt-10">
          <ProgramApplicationForm program={program} />
        </div>
      </div>
    </div>
  );
}
