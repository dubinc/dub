import { getProgram } from "@/lib/fetchers/get-program";
import { BlurImage } from "@dub/ui";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function PartnerBanner({ programSlug }: { programSlug: string }) {
  const program = programSlug ? await getProgram({ slug: programSlug }) : null;

  if (!program) notFound();

  return (
    <div className="-mb-2 flex h-14 items-center justify-center gap-3 rounded-t-lg border border-neutral-200 bg-neutral-50 px-3 pb-2">
      <Suspense fallback={null}>
        <PartnerBannerRSC programSlug={programSlug} />
      </Suspense>
    </div>
  );
}

async function PartnerBannerRSC({ programSlug }: { programSlug: string }) {
  const program = await getProgram({ slug: programSlug });

  if (!program) notFound();

  return (
    <>
      {program.logo && (
        <div className="relative size-6 shrink-0 overflow-hidden rounded-full">
          <BlurImage
            src={program.logo}
            alt="Program logo"
            fill
            className="object-cover"
          />
        </div>
      )}
      <p className="text-left text-sm text-neutral-800">
        <strong className="font-semibold">{program.name}</strong> uses Dub to
        power their partner programs
      </p>
    </>
  );
}
