import { getProgram } from "@/lib/fetchers/get-program";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { BackLink } from "@/ui/shared/back-link";
import { redirect } from "next/navigation";
import { CSSProperties } from "react";
import { ProgramSidebar } from "./program-sidebar";

export default async function ProgramDetailsPage(props: {
  params: Promise<{ programSlug: string }>;
}) {
  const params = await props.params;

  const { programSlug } = params;

  const program = await getProgram({
    slug: programSlug,
    groupSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  if (!program || !program.group) {
    redirect("/programs");
  }

  return (
    <PageContent>
      <PageWidthWrapper className="mb-10 mt-4">
        <BackLink href="/programs">Programs</BackLink>
        <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[300px_minmax(0,600px)]">
          <ProgramSidebar
            program={program}
            applicationRewards={program.rewards}
            applicationDiscount={program.discount}
          />
          <div>
            <div
              className="relative"
              style={
                {
                  "--brand": "#000000",
                  "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
                } as CSSProperties
              }
            >
              {/* Hero section */}
              <div className="grid grid-cols-1 gap-5">
                <h1 className="text-4xl font-semibold">
                  Join the {program.name} affiliate program
                </h1>
                <p className="text-base text-neutral-700">
                  Share {program.name} with your audience and for each
                  subscription generated through your referral, you'll earn a
                  share of the revenue on any plans they purchase.
                </p>
              </div>

              {/* Content blocks */}
              {program.group.landerData && (
                <div className="mt-10 grid grid-cols-1 gap-10">
                  {programLanderSchema
                    .parse(program.group.landerData)
                    .blocks.map((block, idx) => {
                      const Component = BLOCK_COMPONENTS[block.type];
                      return Component ? (
                        <Component
                          key={idx}
                          block={block}
                          group={program.group}
                        />
                      ) : null;
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
