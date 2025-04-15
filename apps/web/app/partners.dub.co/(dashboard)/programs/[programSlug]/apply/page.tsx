import { getProgram } from "@/lib/fetchers/get-program";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander-blocks";
import { BackLink } from "@/ui/shared/back-link";
import { MaxWidthWrapper } from "@dub/ui";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { ProgramSidebar } from "./program-sidebar";

export default async function ProgramDetailsPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await getProgram({
    slug: programSlug,
    include: ["rewards", "defaultDiscount"],
  });

  if (!program) notFound();

  return (
    <MaxWidthWrapper className="my-10">
      <BackLink href="/programs">Programs</BackLink>
      <div className="mt-8 grid grid-cols-1 gap-x-16 lg:grid-cols-[300px_minmax(0,600px)]">
        <div>
          <ProgramSidebar program={program} />
        </div>
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
            {program.landerData && (
              <div className="mt-10 grid grid-cols-1 gap-10">
                {programLanderSchema
                  .parse(program.landerData)
                  .blocks.map((block, idx) => {
                    const Component = BLOCK_COMPONENTS[block.type];
                    return Component ? (
                      <Component key={idx} block={block} logo={program.logo} />
                    ) : null;
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MaxWidthWrapper>
  );
}
