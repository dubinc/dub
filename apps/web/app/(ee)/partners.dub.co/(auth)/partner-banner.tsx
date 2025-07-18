import { BlurImage } from "@dub/ui";
import { Program } from "@prisma/client";

export async function PartnerBanner({
  program,
}: {
  program: Pick<Program, "name" | "logo" | "slug">;
}) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
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
        <a
          href={`https://partners.dub.co/${program.slug}`}
          target="_blank"
          className="font-semibold underline-offset-2 transition-colors hover:underline"
        >
          {program.name}
        </a>{" "}
        uses{" "}
        <a
          href="https://dub.co/partners"
          target="_blank"
          className="font-semibold underline-offset-2 transition-colors hover:underline"
        >
          Dub Partners
        </a>{" "}
        to power their affiliate program
      </p>
    </div>
  );
}
