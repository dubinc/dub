import { getProgram } from "@/lib/fetchers/get-program";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramApplicationForm } from "@/ui/partners/lander/program-application-form";
import { capitalize } from "@dub/utils";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { Header } from "../header";

export default async function ApplicationPage({
  params: { programSlug, groupSlug },
}: {
  params: { programSlug: string; groupSlug?: string };
}) {
  const partnerGroupSlug = groupSlug ?? DEFAULT_PARTNER_GROUP.slug;

  const program = await getProgram({
    slug: programSlug,
    groupSlug: partnerGroupSlug,
  });

  if (!program) {
    notFound();
  }

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
          <h1 className="text-4xl font-semibold">
            Apply to {program.name} {capitalize(partnerGroupSlug)}
          </h1>
          <p className="text-base text-neutral-700">
            Submit your application to join the {program.name} affiliate program
            and start earning commissions for your referrals.
          </p>
        </div>

        <LanderRewards
          className="mt-10"
          rewards={program.rewards}
          discount={program.discount}
        />

        {/* Application form */}
        <div className="mt-10">
          <ProgramApplicationForm program={program} group={program.group!} />
        </div>
      </div>
    </div>
  );
}
