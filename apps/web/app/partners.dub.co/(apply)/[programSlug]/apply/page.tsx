import { getProgram } from "@/lib/fetchers/get-program";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { Header } from "../header";
import { ProgramApplicationForm } from "./form";

export default async function ApplicationPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await getProgram({
    slug: programSlug,
    include: ["rewards", "defaultDiscount"],
  });

  if (!program || !program.defaultRewardId) {
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

        <div className="mt-10">
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            Rewards
          </h2>
          <ProgramRewardList
            rewards={program.rewards}
            discount={program.defaultDiscount}
            className="bg-neutral-100"
          />
        </div>

        {/* Application form */}
        <div className="mt-10">
          <ProgramApplicationForm program={program} />
        </div>
      </div>
    </div>
  );
}
