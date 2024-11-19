import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { DetailsGrid } from "../details-grid";
import { Header } from "../header";
import { ProgramApplicationForm } from "./form";

export default async function ApplicationPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
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

  if (!program) {
    notFound();
  }

  // Get currently logged in user's partner for prefilling the form
  const session = await getSession();
  const partner = session?.user
    ? (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { partners: { include: { partner: true } } },
        })
      )?.partners?.[0]?.partner ?? null
    : null;

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
        showApply={false}
      />
      <div className="p-6">
        {/* Hero section */}
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
            Affiliate Program
          </p>
          <h1 className="text-4xl font-semibold">{program.name} application</h1>
          <p className="text-base text-neutral-700">
            Submit your application to join the affiliate program.
          </p>
        </div>

        {/* Program details grid */}
        <DetailsGrid program={program} className="mt-10" />

        {/* Application form */}
        <div className="mt-10">
          <ProgramApplicationForm
            program={{ id: program.id, name: program.name, slug: program.slug }}
            defaultValues={{
              name: partner?.name ?? undefined,
              email: session?.user?.email ?? undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
