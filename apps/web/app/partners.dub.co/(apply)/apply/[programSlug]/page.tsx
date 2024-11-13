import { prisma } from "@/lib/prisma";
import {
  programLanderBlockSchema,
  programLanderSchema,
} from "@/lib/zod/schemas/programs";
import { AccordionBlock } from "@/ui/partners/lander-blocks/AccordionBlock";
import { FilesBlock } from "@/ui/partners/lander-blocks/FilesBlock";
import { ImageBlock } from "@/ui/partners/lander-blocks/ImageBlock";
import { TextBlock } from "@/ui/partners/lander-blocks/TextBlock";
import { Button } from "@dub/ui";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { z } from "zod";
import { DetailsGrid } from "./details-grid";
import { Header } from "./header";

const BLOCK_COMPONENTS: Record<
  z.infer<typeof programLanderBlockSchema>["type"],
  any
> = {
  image: ImageBlock,
  text: TextBlock,
  files: FilesBlock,
  accordion: AccordionBlock,
};

export default async function ApplyPage({
  params,
}: {
  params: { programSlug: string };
}) {
  const { programSlug } = params;
  const program = await prisma.program.findUnique({
    select: {
      lander: true,
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

  if (!program || !program.lander) notFound();

  const lander = programLanderSchema.parse(program.lander);
  if (!lander) notFound();

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
          <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
            Affiliate Program
          </p>
          <h1 className="text-4xl font-semibold">
            Join the {program.name} affiliate program
          </h1>
          <p className="text-base text-neutral-700">
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
        <DetailsGrid program={program} className="mt-10" />

        {/* Buttons */}
        <div className="mt-10 flex flex-col gap-2">
          <Button
            type="button"
            text="Apply today"
            className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
          />
          {/* <Button type="button" variant="secondary" text="Learn more" /> */}
        </div>

        {/* Content blocks */}
        <div className="mt-16 grid grid-cols-1 gap-10">
          {lander.blocks.map((block, idx) => {
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
