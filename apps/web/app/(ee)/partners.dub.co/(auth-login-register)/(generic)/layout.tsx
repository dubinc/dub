import { getProgram } from "@/lib/fetchers/get-program";
import { getProgramSlugs } from "@/lib/fetchers/get-program-slugs";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { Grid } from "@dub/ui";
import { cn, constructMetadata, PARTNERS_DOMAIN } from "@dub/utils";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Logo } from "../../(auth-other)/logo";
import { PartnerBanner } from "../partner-banner";
import { SidePanel } from "../side-panel";

export async function generateMetadata(props: {
  params: Promise<{ programSlug?: string }>;
}) {
  const { programSlug } = await props.params;

  const program = programSlug
    ? (await getProgram({ slug: programSlug })) ?? undefined
    : undefined;

  if (programSlug && !program) {
    redirect("/register");
  }

  if (program) {
    return constructMetadata({
      title: `${program.name} Affiliate Program`,
      description: `Join the ${program.name} affiliate program and ${
        program.rewards && program.rewards.length > 0
          ? formatRewardDescription(program.rewards[0]).toLowerCase()
          : "earn commissions"
      } by referring ${program.name} to your friends and followers.`,
      image: `${PARTNERS_DOMAIN}/api/og/program?slug=${program.slug}`,
      canonicalUrl: `${PARTNERS_DOMAIN}/${program.slug}`,
    });
  }

  return constructMetadata({
    fullTitle: "Dub Partners | Earn by partnering with world-class companies",
    description:
      "Join thousands of partners who have earned over $10,000,000 on Dub partnering with world-class companies.",
  });
}

export async function generateStaticParams() {
  const programs = await getProgramSlugs();

  return programs.map((program) => ({
    programSlug: program.slug,
  }));
}

export default async function PartnerAuthLayout(props: {
  params: Promise<{ programSlug?: string }>;
  children: ReactNode;
}) {
  const { programSlug } = await props.params;

  const program = programSlug
    ? (await getProgram({ slug: programSlug })) ?? undefined
    : undefined;

  if (programSlug && !program) {
    redirect("/register");
  }
  return (
    <div className="relative grid grid-cols-1 min-[900px]:grid-cols-[440px_minmax(0,1fr)] lg:grid-cols-[595px_minmax(0,1fr)]">
      <PartnerBanner program={program} />
      <SidePanel program={program} />

      <div className="relative">
        <div className="absolute inset-0 isolate overflow-hidden bg-white">
          {/* Grid */}
          <div
            className={cn(
              "absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2",
              "[mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
            )}
          >
            <Grid
              cellSize={60}
              patternOffset={[0.75, 0]}
              className="text-neutral-200"
            />
          </div>

          {/* Gradient */}
          {[...Array(2)].map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6]",
                idx === 0 ? "mix-blend-overlay" : "opacity-10",
              )}
            >
              {[...Array(idx === 0 ? 2 : 1)].map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                    "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="relative flex h-screen w-full justify-center">
          <Logo className="min-[900px]:hidden" />
          {props.children}
        </div>
      </div>
    </div>
  );
}
