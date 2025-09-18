import { getProgram } from "@/lib/fetchers/get-program";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramApplicationForm } from "@/ui/partners/lander/program-application-form";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { ApplyHeader } from "../header";

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

  if (!program || !program.group) {
    notFound();
  }

  const applicationFormData = programApplicationFormSchema.parse(
    program.applicationFormData || {},
  );

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
      <ApplyHeader program={program} showApply={false} />
      <div className="p-6">
        {/* Hero section */}
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
            {applicationFormData.label || `${program.name} Affiliate Program`}
          </p>
          <h1 className="text-4xl font-semibold">
            {applicationFormData.title || `Apply to ${program.name}`}
          </h1>
          <p className="text-base text-neutral-700">
            {applicationFormData.description ||
              `Submit your application to join the ${program.name} affiliate program
            and start earning commissions for your referrals.`}
          </p>
        </div>

        <LanderRewards
          className="mt-10"
          rewards={program.rewards}
          discount={program.discount}
        />

        {/* Application form */}
        <div className="mt-10">
          <ProgramApplicationForm program={program} group={program.group} />
        </div>
      </div>
    </div>
  );
}
