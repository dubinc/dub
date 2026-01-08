import { DubPartnersLogo } from "@/ui/dub-partners-logo";
import { Program } from "@dub/prisma/client";
import Link from "next/link";
import { ProgramLogos } from "./program-logos";

export function SidePanel({
  program,
}: {
  program?: Pick<Program, "name" | "logo" | "slug">;
}) {
  return (
    <div className="hidden h-full flex-col items-start justify-between gap-8 overflow-hidden border-r border-black/5 bg-neutral-50 min-[900px]:flex">
      <div className="grow basis-0 p-4 lg:p-10">
        <DubPartnersLogo className="w-fit" />
      </div>
      {program ? (
        <div className="relative w-full">
          {program.logo && (
            <div className="absolute inset-0 blur-[100px]">
              <img
                className="absolute bottom-0 left-1/2 size-72 shrink-0 -translate-x-1/2 translate-y-1/2 -skew-x-12 rounded-full opacity-50"
                src={program.logo}
                alt={`${program.name} logo`}
              />
            </div>
          )}
          <div className="relative flex flex-col gap-8 p-4 lg:p-10">
            {program.logo && (
              <img
                className="size-14 shrink-0 rounded-full"
                src={program.logo}
                alt={`${program.name} logo`}
              />
            )}
            <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium [&_strong]:font-semibold">
              <strong>{program.name}</strong> uses{" "}
              <a
                href="https://dub.co/partners"
                target="_blank"
                className="text-neutral-600 decoration-dotted underline-offset-2 transition-colors hover:underline"
              >
                <strong>Dub Partners</strong>
              </a>{" "}
              to power their affiliate program
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 px-4 lg:px-10">
            <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium">
              Join thousands of others who have earned over $10,000,000 on Dub
              partnering with world-class companies.
            </p>
            <Link
              target="_blank"
              href="https://dub.co/blog/10m-payouts"
              className="text-content-emphasis flex h-8 w-fit items-center rounded-lg bg-black/5 px-3 text-sm font-medium transition-[transform,background-color] duration-75 hover:bg-black/10 active:scale-[0.98]"
            >
              Read more
            </Link>
          </div>

          <div className="w-full grow basis-0">
            <ProgramLogos />
          </div>
        </>
      )}
    </div>
  );
}
