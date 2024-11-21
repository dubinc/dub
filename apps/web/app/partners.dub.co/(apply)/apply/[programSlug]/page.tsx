import { prisma } from "@/lib/prisma";
import { programLanderSchema } from "@/lib/zod/schemas/programs";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander-blocks";
import { cn } from "@dub/utils";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { ApplyButton } from "./apply-button";
import { DetailsGrid } from "./details-grid";
import { Header } from "./header";

export default async function ApplyPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await prisma.program.findUnique({
    select: {
      landerData: true,
      name: true,
      logo: true,
      wordmark: true,
      brandColor: true,
      commissionType: true,
      commissionAmount: true,
      isLifetimeRecurring: true,
    },
    where: {
      slug: programSlug,
    },
  });

  if (!program || !program.landerData) {
    notFound();
  }

  const landerData = programLanderSchema.parse(program.landerData);

  if (!landerData) {
    notFound();
  }

  return (
    <div
      className="relative"
      style={
        {
          "--brand": program.brandColor || "#3b82f6",
          "--brand-ring": "rgb(from var(--brand) r g b / 0.4)",
        } as CSSProperties
      }
    >
      <Header
        program={{ logo: program.logo, wordmark: program.wordmark }}
        slug={programSlug}
      />
      <div className="p-6">
        {/* Hero section */}
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <span
            className={cn(
              "font-mono text-xs font-medium uppercase text-[var(--brand)]",
              "animate-slide-up-fade [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            Affiliate Program
          </span>
          <h1
            className={cn(
              "text-4xl font-semibold",
              "animate-slide-up-fade [--offset:5px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            Join the {program.name} affiliate program
          </h1>
          <p
            className={cn(
              "text-base text-neutral-700",
              "animate-slide-up-fade [--offset:5px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
            )}
          >
            Share {program.name} with your audience and for each subscription
            generated through your referral, you'll earn a share of the revenue
            on any plans they purchase.
          </p>
          {/* <p className="text-xs text-neutral-500">
              Read our{" "}
              <a
                href="#"
                className="underline transition-colors duration-100 hover:text-neutral-600"
              >
                Terms of Service
              </a>{" "}
              for more details.
            </p> */}
        </div>

        {/* Program details grid */}
        <DetailsGrid
          program={program}
          className="animate-slide-up-fade mt-10 [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]"
        />

        {/* Buttons */}
        <div className="animate-scale-in-fade mt-10 flex flex-col gap-2 [animation-delay:400ms] [animation-fill-mode:both]">
          <ApplyButton programSlug={programSlug} />
          {/* <Button type="button" variant="secondary" text="Learn more" /> */}
        </div>

        {/* Content blocks */}
        <div className="mt-16 grid grid-cols-1 gap-10">
          {landerData.blocks.map((block, idx) => {
            const Component = BLOCK_COMPONENTS[block.type];
            return Component ? (
              <Component key={idx} block={block} logo={program.logo} />
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
