import { Program } from "@dub/prisma/client";
import { BlurImage } from "@dub/ui";
import Link from "next/link";

export function PartnerBanner({
  program,
}: {
  program?: Pick<Program, "name" | "logo" | "slug">;
}) {
  if (!program) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-[60px] items-center justify-center gap-2 border-b border-neutral-200 bg-neutral-50/80 p-3 backdrop-blur-sm min-[900px]:hidden">
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
        <Link
          href={`/${program.slug}`}
          className="font-semibold underline-offset-2 transition-colors hover:underline"
        >
          {program.name}
        </Link>{" "}
        uses{" "}
        <a
          href="https://dub.co/partners"
          target="_blank"
          className="font-semibold text-neutral-600 decoration-dotted underline-offset-2 transition-colors hover:underline"
        >
          Dub Partners
        </a>{" "}
        to power their affiliate program
      </p>
    </div>
  );
}
