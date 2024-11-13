import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { Header } from "../../header";

export default async function SuccessPage({
  params,
}: {
  params: { programSlug: string };
}) {
  const { programSlug } = params;
  const program = await prisma.program.findUnique({
    select: {
      id: true,
      name: true,
      slug: true,
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

  if (!program) notFound();

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
        program={{
          logo: program.logo,
          wordmark: program.wordmark,
        }}
        slug={programSlug}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <h1 className="text-4xl font-semibold">Application submitted</h1>
          <p className="text-base text-neutral-700">
            Your application has been submitted for review.
          </p>
        </div>
      </div>
    </div>
  );
}
