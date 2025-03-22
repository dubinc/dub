import { BlurImage } from "@dub/ui";
import { Program } from "@prisma/client";

export async function PartnerBanner({
  program,
}: {
  program: Pick<Program, "name" | "logo">;
}) {
  return (
    <div className="-mb-2 flex items-center justify-center gap-3 rounded-t-lg border border-neutral-200 bg-neutral-50 p-3 pb-5">
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
    </div>
  );
}
