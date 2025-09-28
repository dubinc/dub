import { getProgram } from "@/lib/fetchers/get-program";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programApplicationFormSchema } from "@/lib/zod/schemas/program-application-form";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramApplicationForm } from "@/ui/partners/groups/design/program-application-form";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { ApplyHeader } from "../header";
import { ApplicationFormHero } from "@/ui/partners/groups/design/previews/application-hero-preview";

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

  if (!program || !program.group || !program.group.applicationFormData || !program.group.applicationFormPublishedAt) {
    notFound();
  }

  const applicationFormData = programApplicationFormSchema.parse(
    program.group.applicationFormData || program.applicationFormData || {},
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
        <ApplicationFormHero program={program} applicationFormData={applicationFormData} />

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
